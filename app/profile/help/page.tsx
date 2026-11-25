"use client";

import { useState } from "react";
import { MobileShell } from "@/components/mobile-shell";
import { TopHeader } from "@/components/top-header";
import { Button } from "@/components/ui/button";

const FAQS = [
  {
    q: "How do I save an indoor basement parking spot?",
    a: "Tap Save Parking on the Home screen, enter your floor and zone (e.g. B2 - Pillar C4), and snap a photo of your surroundings so you can find it even without strong GPS.",
  },
  {
    q: "Why does outdoor GPS accuracy sometimes drift?",
    a: "Tall buildings or covered roofs can weaken satellite signals. Enable High-Accuracy GPS in App Settings and add a quick photo or landmark note as backup.",
  },
  {
    q: "How does license plate scanning work?",
    a: "When capturing a vehicle photo, ParkSense reads the plate text locally on your device. Make sure the plate is well-lit and centered in the frame.",
  },
  {
    q: "Can I view my previous parking spots?",
    a: "Yes. Open the History tab at the bottom bar to inspect past parking logs, view saved photos, or delete old records.",
  },
];

export default function HelpSupportPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setSent(true);
    setMessage("");
    setTimeout(() => setSent(false), 3000);
  }

  return (
    <MobileShell>
      <div className="flex flex-col flex-1 pb-4 space-y-4">
        <TopHeader title="Help & Support" backHref="/profile" />

        {/* FAQ Accordion */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#5E6E82] px-1 mb-2">
            Frequently Asked Questions
          </h2>
          <div className="bg-white rounded-2xl border border-[#EDF2F7] shadow-xs divide-y divide-[#F1F5F9] overflow-hidden">
            {FAQS.map((item, idx) => {
              const isOpen = openIndex === idx;
              return (
                <div key={idx}>
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-[#F9FAFC] transition-colors cursor-pointer"
                  >
                    <span className="text-sm font-semibold text-[#0B1222]">
                      {item.q}
                    </span>
                    <svg
                      className={`w-4 h-4 text-[#8E95A5] shrink-0 transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                  {isOpen && (
                    <p className="px-4 pb-4 text-xs leading-relaxed text-[#5E6E82]">
                      {item.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Contact / Report Issue Card */}
        <form
          onSubmit={handleSend}
          className="bg-white rounded-2xl border border-[#EDF2F7] shadow-xs p-4 space-y-3"
        >
          <div>
            <h2 className="text-sm font-bold text-[#0B1222]">
              Need more help?
            </h2>
            <p className="text-xs text-[#5E6E82] mt-0.5">
              Send feedback or report an issue to the ParkSense team.
            </p>
          </div>

          <textarea
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe your question or bug..."
            className="w-full rounded-xl border border-[#E3E8EF] px-3.5 py-2.5 text-sm text-[#0B1222] placeholder:text-[#8E95A5] focus:outline-none focus:border-[#007AFF] resize-none"
          />

          {sent && (
            <p
              role="status"
              className="text-xs font-semibold text-[#15803D] bg-[#ECFDF3] border border-[#BBF7D0] rounded-lg px-3 py-2"
            >
              Thanks! Your message has been recorded.
            </p>
          )}

          <Button type="submit" variant="primary" className="py-2.5 text-sm">
            Send Message
          </Button>
        </form>
      </div>
    </MobileShell>
  );
}