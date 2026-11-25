import { PaddleOCR } from "@paddleocr/paddleocr-js";
import cv from "@techstark/opencv-js";
import { env, InferenceSession, Tensor } from "onnxruntime-web";
import { findPlateCandidate, readPlate, type ScanMessage, type ScannedVehicle } from "./vehicle-scan";

const runtimePath = new URL("/vision-runtime/", self.location.origin).href;
env.wasm.wasmPaths = runtimePath;
env.wasm.numThreads = 1;

const classes = new Map<number, ScannedVehicle>([[1, "Bicycle"], [2, "Car"], [3, "Motorcycle"]]);
type Region = { x: number; y: number; w: number; h: number };

function pixels(width: number, height: number) {
  const context = new OffscreenCanvas(width, height).getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Image processing is unavailable.");
  return context;
}

async function findVehicle(image: ImageBitmap) {
  const side = 640;
  const scale = Math.min(side / image.width, side / image.height);
  const ctx = pixels(side, side);
  ctx.fillStyle = "rgb(114,114,114)";
  ctx.fillRect(0, 0, side, side);
  ctx.drawImage(image, 0, 0, image.width * scale, image.height * scale);
  const rgba = ctx.getImageData(0, 0, side, side).data;
  const plane = side * side;
  const rgb = new Float32Array(3 * plane);
  for (let i = 0; i < plane; i++) {
    rgb[i] = rgba[4 * i] / 255;
    rgb[plane + i] = rgba[4 * i + 1] / 255;
    rgb[2 * plane + i] = rgba[4 * i + 2] / 255;
  }

  const session = await InferenceSession.create("/models/yolov10n.onnx", { executionProviders: ["wasm"] });
  try {
    const input = new Tensor("float32", rgb, [1, 3, side, side]);
    const { output0 } = await session.run({ images: input });
    const boxes = output0.data as Float32Array;
    let best: { type: ScannedVehicle; region: Region; rank: number } | null = null;
    // YOLOv10 returns [x1, y1, x2, y2, confidence, COCO class] per detection.
    for (let i = 0; i < boxes.length; i += 6) {
      const score = boxes[i + 4];
      const type = classes.get(boxes[i + 5]);
      if (!type || score < 0.45) continue;
      const x = Math.max(0, boxes[i] / scale);
      const y = Math.max(0, boxes[i + 1] / scale);
      const w = Math.min(image.width, boxes[i + 2] / scale) - x;
      const h = Math.min(image.height, boxes[i + 3] / scale) - y;
      if (w < 1 || h < 1) continue;
      const rank = w * h * score;
      if (!best || rank > best.rank) best = { type, region: { x, y, w, h }, rank };
    }
    return best;
  } finally {
    await session.release();
  }
}

async function findPlate(image: ImageBitmap, region: Region) {
  const ocr = await PaddleOCR.create({
    textDetectionModelName: "PP-OCRv6_tiny_det",
    textDetectionModelAsset: { url: "/models/PP-OCRv6_tiny_det.tar" },
    textRecognitionModelName: "PP-OCRv6_tiny_rec",
    textRecognitionModelAsset: { url: "/models/PP-OCRv6_tiny_rec.tar" },
    ortOptions: { backend: "wasm", wasmPaths: runtimePath, numThreads: 1 },
  });
  try {
    const { x, y, w, h } = region;
    const scale = Math.min(1, 1280 / Math.max(w, h));
    const width = Math.max(1, Math.round(w * scale));
    const height = Math.max(1, Math.round(h * scale));
    const ctx = pixels(width, height);
    ctx.drawImage(image, x, y, w, h, 0, 0, width, height);
    const imgData = ctx.getImageData(0, 0, width, height);
    const mat = cv.matFromImageData(imgData);
    try {
      const [result] = await ocr.predict(mat);
      let plateResult = readPlate(result.items);
      let candidate = plateResult?.plate ? undefined : findPlateCandidate(result.items);

      // Invert color fallback for dark/black plates (white text on black background)
      if (!plateResult && !candidate) {
        const d = imgData.data;
        let sum = 0;
        for (let i = 0; i < d.length; i += 4) {
          sum += (d[i] + d[i + 1] + d[i + 2]) / 3;
        }
        const avgBrightness = sum / (d.length / 4);
        if (avgBrightness < 130) {
          for (let i = 0; i < d.length; i += 4) {
            d[i] = 255 - d[i];
            d[i + 1] = 255 - d[i + 1];
            d[i + 2] = 255 - d[i + 2];
          }
          const invMat = cv.matFromImageData(imgData);
          try {
            const [invResult] = await ocr.predict(invMat);
            plateResult = readPlate(invResult.items);
            candidate = plateResult?.plate ? undefined : findPlateCandidate(invResult.items);
          } finally {
            invMat.delete();
          }
        }
      }

      const licensePlate = plateResult?.plate ?? null;
      const alternativePlate = plateResult?.alternative;
      return {
        licensePlate,
        alternativePlate,
        plateCandidate: licensePlate ? undefined : candidate,
      };
    } finally {
      mat.delete();
    }
  } finally {
    await ocr.dispose();
  }
}

self.onmessage = async ({ data: photo }: MessageEvent<Blob>) => {
  let image: ImageBitmap | undefined;
  let message: ScanMessage;
  try {
    image = await createImageBitmap(photo);
    const vehicle = await findVehicle(image);
    // Pad vehicle region by 15% so bumper/fender mounted license plates aren't clipped
    const region = vehicle?.region ? {
      x: Math.max(0, vehicle.region.x - vehicle.region.w * 0.15),
      y: Math.max(0, vehicle.region.y - vehicle.region.h * 0.15),
      w: Math.min(image.width - Math.max(0, vehicle.region.x - vehicle.region.w * 0.15), vehicle.region.w * 1.3),
      h: Math.min(image.height - Math.max(0, vehicle.region.y - vehicle.region.h * 0.15), vehicle.region.h * 1.3),
    } : { x: 0, y: 0, w: image.width, h: image.height };

    let plate = await findPlate(image, region);
    // Fallback: If vehicle crop yielded no plate, scan the full original image
    if (!plate.licensePlate && !plate.plateCandidate && vehicle) {
      plate = await findPlate(image, { x: 0, y: 0, w: image.width, h: image.height });
    }
    message = { result: { vehicleType: vehicle?.type ?? null, ...plate } };
  } catch {
    message = { error: "Scan unavailable. Try again or enter the vehicle details manually." };
  } finally {
    image?.close();
  }
  self.postMessage(message);
};
