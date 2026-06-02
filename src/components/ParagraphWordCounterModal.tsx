import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const TARGET_WORDS = 1000;

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function ParagraphWordCounterModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const wordCount = useMemo(() => countWords(text), [text]);
  const difference = TARGET_WORDS - wordCount;
  const progress = Math.min(Math.round((wordCount / TARGET_WORDS) * 100), 999);

  return (
    <>
      <Button variant="outline" onClick={() => setIsOpen(true)}>
        Paragraph Counter
      </Button>

      {isOpen ? (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div
            className="modal-panel max-h-[90vh] overflow-y-auto space-y-4"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="paragraph-counter-title"
          >
            <div className="modal-header">
              <div>
                <h2 id="paragraph-counter-title" className="modal-title text-xl font-semibold">
                  Paragraph Word Counter
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Paste the passage you read to check its word count against the 1000-word practice target.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close paragraph counter"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <Textarea
              value={text}
              placeholder="Paste or type your paragraph here..."
              className="min-h-48 max-h-80 overflow-y-auto resize-y field-sizing-fixed"
              onChange={(event) => setText(event.target.value)}
            />

            <div className="grid gap-3 md:grid-cols-3">
              <Card className="rounded-2xl shadow-sm" size="sm">
                <CardHeader className="pb-1">
                  <CardTitle className="text-sm">Word Count</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">{wordCount}</CardContent>
              </Card>

              <Card className="rounded-2xl shadow-sm" size="sm">
                <CardHeader className="pb-1">
                  <CardTitle className="text-sm">1000-Word Target</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">
                  {difference > 0 ? `${difference} left` : difference < 0 ? `${Math.abs(difference)} over` : "Matched"}
                </CardContent>
              </Card>

              <Card className="rounded-2xl shadow-sm" size="sm">
                <CardHeader className="pb-1">
                  <CardTitle className="text-sm">Progress</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">{wordCount ? `${progress}%` : "0%"}</CardContent>
              </Card>
            </div>

            <div className="rounded-xl border bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {wordCount === 0
                ? "Add or paste text to begin counting words."
                : difference > 0
                  ? `This passage is ${difference} words short of 1000.`
                  : difference < 0
                    ? `This passage is ${Math.abs(difference)} words over 1000.`
                    : "This passage matches the 1000-word target exactly."}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
