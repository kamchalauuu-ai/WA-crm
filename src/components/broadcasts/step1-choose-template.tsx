'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MessageTemplate } from '@/types';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, ArrowRight, QrCode, Sparkles, CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

const categoryColors: Record<string, string> = {
  Marketing: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Utility: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Authentication: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

export const DIRECT_QR_TEMPLATE: MessageTemplate = {
  id: 'direct-qr-custom-template',
  user_id: '',
  name: 'Direct Custom Text Broadcast (QR / Anti-Ban)',
  category: 'Marketing',
  language: 'en_US',
  body_text: 'Hello {{1}}, thank you for your message!',
  status: 'APPROVED',
  created_at: new Date().toISOString(),
};

interface Step1Props {
  selectedTemplate: MessageTemplate | null;
  onSelect: (template: MessageTemplate) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step1ChooseTemplate({ selectedTemplate, onSelect, onNext, onBack }: Step1Props) {
  const t = useTranslations('Broadcasts.wizard');
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTemplates() {
      try {
        const supabase = createClient();
        const { data, error: fetchError } = await supabase
          .from('message_templates')
          .select('*')
          .eq('status', 'APPROVED')
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;
        setTemplates(data ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('chooseTemplate.errorLoad'));
      } finally {
        setLoading(false);
      }
    }

    fetchTemplates();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  const isDirectSelected = selectedTemplate?.id === DIRECT_QR_TEMPLATE.id;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{t('chooseTemplate.title')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('chooseTemplate.subtitle')}
        </p>
      </div>

      {/* Featured Card: Direct QR Custom Text Broadcast */}
      <div
        onClick={() => onSelect(DIRECT_QR_TEMPLATE)}
        className={`relative flex cursor-pointer flex-col gap-3 rounded-xl border p-5 transition-all ${
          isDirectSelected
            ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30'
            : 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/60 hover:bg-emerald-500/10'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/20 p-2 text-emerald-500">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">
                  Direct Custom Text Broadcast
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                  <Sparkles className="h-3 w-3" />
                  Free / Anti-Ban / No Meta Approval Needed
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Send direct custom text messages with Spintax & CSV variables via your connected QR WhatsApp Web device.
              </p>
            </div>
          </div>
          {isDirectSelected && <CheckCircle2 className="h-6 w-6 text-emerald-500" />}
        </div>
      </div>

      <div className="pt-2">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Or Select Meta Cloud API Template ({templates.length})
        </h3>

        {templates.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-border bg-card/50 text-center p-4">
            <FileText className="mb-2 h-6 w-6 text-muted-foreground/60" />
            <p className="text-xs text-muted-foreground">No Meta Cloud templates found.</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground/80">
              You can select the <strong>Direct Custom Text Broadcast</strong> card above to send bulk messages directly via QR Web!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => {
              const isSelected = selectedTemplate?.id === template.id;
              const catColor = categoryColors[template.category] ?? categoryColors.Utility;

              return (
                <button
                  key={template.id}
                  onClick={() => onSelect(template)}
                  className={`flex flex-col gap-3 rounded-xl border p-4 text-left transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                      : 'border-border bg-card/50 hover:border-border hover:bg-card'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <h3 className="text-sm font-medium text-foreground">{template.name}</h3>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${catColor}`}
                    >
                      {template.category}
                    </span>
                  </div>
                  <p className="line-clamp-3 text-xs text-muted-foreground">{template.body_text}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{template.language ?? 'en_US'}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border pt-4">
        <Button variant="outline" onClick={onBack} className="border-border text-muted-foreground">
          {t('back')}
        </Button>
        <Button
          onClick={onNext}
          disabled={!selectedTemplate}
          className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {t('next')}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
