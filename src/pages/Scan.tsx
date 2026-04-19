import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ScanLine, Upload, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { addDays } from "@/lib/expiry";

interface ParsedItem {
  name: string;
  quantity: string | null;
  estimated_shelf_life_days: number;
  selected: boolean;
}

async function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const [meta, b64] = result.split(",");
      const mt = /data:(.*?);base64/.exec(meta)?.[1] ?? file.type ?? "image/jpeg";
      resolve({ base64: b64, mimeType: mt });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const Scan = () => {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [items, setItems] = useState<ParsedItem[] | null>(null);
  const [saving, setSaving] = useState(false);

  const handleFile = async (file: File) => {
    setItems(null);
    setPreviewUrl(URL.createObjectURL(file));
    setScanning(true);
    try {
      const { base64, mimeType } = await fileToBase64(file);
      const { data, error } = await supabase.functions.invoke("scan-receipt", {
        body: { imageBase64: base64, mimeType },
      });
      if (error) throw error;
      const parsed = (data?.items ?? []) as Array<Omit<ParsedItem, "selected">>;
      if (parsed.length === 0) {
        toast.warning("No items found. Try a clearer photo of the receipt.");
      } else {
        toast.success(`Found ${parsed.length} item${parsed.length === 1 ? "" : "s"}`);
      }
      setItems(parsed.map((p) => ({ ...p, selected: true })));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Scan failed";
      toast.error(msg);
    } finally {
      setScanning(false);
    }
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const toggle = (i: number) =>
    setItems((curr) => curr?.map((it, idx) => (idx === i ? { ...it, selected: !it.selected } : it)) ?? null);

  const updateField = <K extends keyof ParsedItem>(i: number, key: K, value: ParsedItem[K]) =>
    setItems((curr) => curr?.map((it, idx) => (idx === i ? { ...it, [key]: value } : it)) ?? null);

  const saveAll = async () => {
    if (!items) return;
    const chosen = items.filter((i) => i.selected && i.name.trim());
    if (chosen.length === 0) {
      toast.error("Select at least one item");
      return;
    }
    setSaving(true);
    const rows = chosen.map((it) => ({
      name: it.name.trim(),
      quantity: it.quantity || null,
      estimated_shelf_life_days: it.estimated_shelf_life_days,
      expiry_date: addDays(it.estimated_shelf_life_days),
      source: "receipt",
    }));
    const { error } = await supabase.from("pantry_items").insert(rows);
    setSaving(false);
    if (error) {
      toast.error("Could not save items");
      return;
    }
    toast.success(`Added ${rows.length} item${rows.length === 1 ? "" : "s"} to pantry`);
    navigate("/");
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <ScanLine className="h-6 w-6 text-primary" /> Scan a receipt
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a photo of your grocery receipt. We'll read the items and estimate how long
          each one stays fresh.
        </p>
      </header>

      <Card className="p-6 bg-gradient-warm border-0 shadow-soft">
        <div className="flex flex-col items-center text-center gap-4 py-6">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Receipt preview"
              className="max-h-64 rounded-lg shadow-soft object-contain bg-card"
            />
          ) : (
            <div className="h-24 w-24 rounded-full bg-card flex items-center justify-center shadow-soft">
              <ScanLine className="h-10 w-10 text-primary" />
            </div>
          )}
          <div className="flex gap-2 flex-wrap justify-center">
            <Button onClick={() => fileRef.current?.click()} variant="hero" size="lg" disabled={scanning}>
              {scanning ? <Loader2 className="animate-spin" /> : <Upload />}
              {previewUrl ? "Choose another" : "Upload receipt photo"}
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPick}
          />
          {scanning && (
            <p className="text-sm text-muted-foreground">Reading receipt with AI…</p>
          )}
        </div>
      </Card>

      {items && items.length > 0 && (
        <section className="space-y-3 animate-fade-in">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Review items</h2>
              <p className="text-xs text-muted-foreground">
                Tap to deselect, edit names or expiry days as needed.
              </p>
            </div>
            <Button onClick={saveAll} disabled={saving} variant="accent">
              {saving ? <Loader2 className="animate-spin" /> : <Check />}
              Add to pantry
            </Button>
          </div>

          <div className="grid gap-2">
            {items.map((it, i) => (
              <Card
                key={i}
                className={`p-3 flex items-center gap-3 transition-colors ${
                  it.selected ? "" : "opacity-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={it.selected}
                  onChange={() => toggle(i)}
                  className="h-4 w-4 accent-[hsl(var(--primary))]"
                />
                <input
                  value={it.name}
                  onChange={(e) => updateField(i, "name", e.target.value)}
                  className="flex-1 bg-transparent font-medium outline-none focus:underline"
                />
                <input
                  value={it.quantity ?? ""}
                  onChange={(e) => updateField(i, "quantity", e.target.value || null)}
                  placeholder="qty"
                  className="w-16 bg-transparent text-xs text-muted-foreground outline-none focus:underline text-right"
                />
                <div className="flex items-center gap-1 text-xs">
                  <input
                    type="number"
                    min={1}
                    value={it.estimated_shelf_life_days}
                    onChange={(e) =>
                      updateField(i, "estimated_shelf_life_days", Number(e.target.value) || 1)
                    }
                    className="w-14 bg-secondary rounded px-1.5 py-1 outline-none focus:ring-1 focus:ring-ring text-right"
                  />
                  <span className="text-muted-foreground">days</span>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default Scan;
