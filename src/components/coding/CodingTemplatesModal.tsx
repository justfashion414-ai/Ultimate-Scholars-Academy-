import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  LayoutTemplate, 
  FileCode, 
  FileText, 
  FileJson, 
  Eye, 
  Check, 
  ArrowRight,
  Code2,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { CODING_TEMPLATES, CodingTemplate } from './templates';

interface CodingTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: CodingTemplate) => void;
  hasExistingCode: boolean;
}

export default function CodingTemplatesModal({
  isOpen,
  onClose,
  onSelectTemplate,
  hasExistingCode
}: CodingTemplatesModalProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(CODING_TEMPLATES[0].id);
  const [previewTab, setPreviewTab] = useState<'visual' | 'html' | 'css' | 'js'>('visual');
  const [showConfirmOverride, setShowConfirmOverride] = useState(false);

  const selectedTemplate = useMemo(() => {
    return CODING_TEMPLATES.find(t => t.id === selectedTemplateId) || CODING_TEMPLATES[0];
  }, [selectedTemplateId]);

  // Generate preview blob for the selected template
  const previewHtml = useMemo(() => {
    let html = selectedTemplate.files['index.html'] || '';
    const css = selectedTemplate.files['styles.css'] || '';
    const js = selectedTemplate.files['script.js'] || '';

    if (css) {
      if (html.includes('</head>')) {
        html = html.replace('</head>', `<style>${css}</style></head>`);
      } else {
        html = `<style>${css}</style>` + html;
      }
    }

    if (js) {
      const scriptTag = `<script>${js}<\/script>`;
      if (html.includes('</body>')) {
        html = html.replace('</body>', `${scriptTag}</body>`);
      } else {
        html += scriptTag;
      }
    }

    return html;
  }, [selectedTemplate]);

  if (!isOpen) return null;

  const handleApplyClick = () => {
    if (hasExistingCode) {
      setShowConfirmOverride(true);
    } else {
      onSelectTemplate(selectedTemplate);
      onClose();
    }
  };

  const handleConfirmApply = () => {
    setShowConfirmOverride(false);
    onSelectTemplate(selectedTemplate);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#0b1739] border border-white/15 rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden text-white"
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0F2557]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#D4A017] rounded-xl text-[#0F2557]">
              <LayoutTemplate className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                Starter Code Templates
                <span className="text-[11px] font-normal px-2.5 py-0.5 rounded-full bg-[#D4A017]/20 text-[#D4A017] border border-[#D4A017]/30">
                  3 Built-in Options
                </span>
              </h2>
              <p className="text-xs text-white/60">
                Preview and apply clean boilerplate code to your editor
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY: TEMPLATE LIST + PREVIEW */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* TEMPLATE PICKER COLUMN */}
          <div className="w-full md:w-80 border-r border-white/10 bg-[#071126] p-4 flex flex-col gap-3 overflow-y-auto">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/40 px-1">
              Select Template
            </span>

            {CODING_TEMPLATES.map((tmpl) => {
              const isSelected = tmpl.id === selectedTemplateId;
              return (
                <button
                  key={tmpl.id}
                  onClick={() => {
                    setSelectedTemplateId(tmpl.id);
                    setPreviewTab('visual');
                  }}
                  className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 ${
                    isSelected
                      ? 'bg-[#0F2557] border-[#D4A017] shadow-lg shadow-[#D4A017]/10'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white flex items-center gap-1.5">
                      {tmpl.category === 'html' && <FileCode className="w-4 h-4 text-emerald-400" />}
                      {tmpl.category === 'html-css' && <FileText className="w-4 h-4 text-sky-400" />}
                      {tmpl.category === 'html-css-js' && <FileJson className="w-4 h-4 text-amber-400" />}
                      {tmpl.title}
                    </span>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-[#D4A017] animate-pulse" />
                    )}
                  </div>
                  <span className="text-[10px] font-semibold text-[#D4A017] uppercase tracking-wide">
                    {tmpl.tagLabel}
                  </span>
                  <p className="text-xs text-white/60 line-clamp-2">
                    {tmpl.description}
                  </p>
                </button>
              );
            })}

            <div className="mt-auto p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white/60">
              <span className="font-bold text-white block mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#D4A017]" />
                Editor Note
              </span>
              The editor starts empty by default. Applying a template will fill the HTML, CSS, and JS tabs accordingly.
            </div>
          </div>

          {/* PREVIEW & CODE INSPECTION PANEL */}
          <div className="flex-1 flex flex-col bg-[#050E22] overflow-hidden">
            {/* TABS */}
            <div className="flex items-center justify-between px-6 py-2.5 bg-[#0F2557]/40 border-b border-white/10">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPreviewTab('visual')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    previewTab === 'visual'
                      ? 'bg-[#D4A017] text-[#0F2557]'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  Live Preview
                </button>
                <button
                  onClick={() => setPreviewTab('html')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    previewTab === 'html'
                      ? 'bg-white/15 text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5 text-emerald-400" />
                  index.html
                </button>
                <button
                  onClick={() => setPreviewTab('css')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    previewTab === 'css'
                      ? 'bg-white/15 text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-sky-400" />
                  styles.css {selectedTemplate.files['styles.css'] ? '' : '(Empty)'}
                </button>
                <button
                  onClick={() => setPreviewTab('js')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    previewTab === 'js'
                      ? 'bg-white/15 text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <FileJson className="w-3.5 h-3.5 text-amber-400" />
                  script.js {selectedTemplate.files['script.js'] ? '' : '(Empty)'}
                </button>
              </div>

              <div className="hidden sm:block text-xs text-white/40">
                {selectedTemplate.title}
              </div>
            </div>

            {/* CONTENT VIEW */}
            <div className="flex-1 relative overflow-auto">
              {previewTab === 'visual' && (
                <div className="w-full h-full bg-white relative">
                  <iframe
                    srcDoc={previewHtml}
                    title="Template Preview"
                    className="w-full h-full border-none"
                    sandbox="allow-scripts"
                  />
                </div>
              )}

              {previewTab === 'html' && (
                <pre className="p-6 font-mono text-xs text-emerald-300 whitespace-pre-wrap leading-relaxed select-text">
                  {selectedTemplate.files['index.html'] || '// (Empty HTML)'}
                </pre>
              )}

              {previewTab === 'css' && (
                <pre className="p-6 font-mono text-xs text-sky-300 whitespace-pre-wrap leading-relaxed select-text">
                  {selectedTemplate.files['styles.css'] || '/* This template does not include any CSS */'}
                </pre>
              )}

              {previewTab === 'js' && (
                <pre className="p-6 font-mono text-xs text-amber-300 whitespace-pre-wrap leading-relaxed select-text">
                  {selectedTemplate.files['script.js'] || '// This template does not include any JavaScript'}
                </pre>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER ACTION BAR */}
        <div className="px-6 py-4 border-t border-white/10 bg-[#0F2557] flex items-center justify-between">
          <div className="text-xs text-white/60">
            Selected: <span className="text-white font-bold">{selectedTemplate.title}</span> ({selectedTemplate.tagLabel})
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyClick}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#D4A017] hover:bg-[#b0820e] text-[#0F2557] font-bold text-xs shadow-lg transition-transform active:scale-95 cursor-pointer"
            >
              <span>Add to Editor</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* CONFIRM OVERWRITE MODAL */}
        <AnimatePresence>
          {showConfirmOverride && (
            <div className="absolute inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-[#0F2557] border border-[#D4A017]/40 p-6 rounded-2xl max-w-md w-full shadow-2xl text-center space-y-4"
              >
                <div className="w-12 h-12 rounded-full bg-[#D4A017]/20 border border-[#D4A017]/40 flex items-center justify-center mx-auto text-[#D4A017]">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">Replace Current Editor Code?</h3>
                <p className="text-xs text-white/70 leading-relaxed">
                  Your editor already contains code. Loading this template will overwrite your current workspace with the <span className="text-[#D4A017] font-bold">{selectedTemplate.title}</span>.
                </p>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowConfirmOverride(false)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white transition-colors"
                  >
                    Keep Current Code
                  </button>
                  <button
                    onClick={handleConfirmApply}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[#D4A017] hover:bg-[#b0820e] text-[#0F2557] transition-colors"
                  >
                    Yes, Apply Template
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
