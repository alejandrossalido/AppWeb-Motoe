
import React, { useState, useRef, useEffect } from 'react';
import { geminiChat } from '../services/geminiService';
import { supabase } from '../services/supabase';

const AIChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'bot', text: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsLoading(true);

    try {
      // 1. RAG Lite: Extract keywords > 3 chars
      const keywords = userMsg.toLowerCase().split(' ').filter(w => w.length > 3);
      let systemContext = "";

      if (keywords.length > 0) {
        // Build search query: (cat ilike k1 OR comp ilike k1) OR (cat ilike k2...)
        // Simplified: just match ANY keyword in component_name OR category OR notes
        const orConditions = keywords.map(k => `component_name.ilike.%${k}%,category.ilike.%${k}%,notes.ilike.%${k}%`).join(',');

        const { data: specs } = await supabase
          .from('moto_specs')
          .select('*')
          .or(orConditions)
          .limit(5);

        if (specs && specs.length > 0) {
          const dataStr = specs.map(s => {
            const fileInfo = s.file_url ? "[TIENE ARCHIVO ADJUNTO]" : "[Sin archivo]";
            return `- ${s.category}: ${s.component_name} (Valor: ${s.spec_value}). Notas: ${s.notes || 'N/A'}. ${fileInfo}`;
          }).join('\n');

          systemContext = `INFORMACIÓN TÉCNICA ENCONTRADA (ÚSALA):\n${dataStr}\n\nINSTRUCCIÓN: Si la información anterior es útil, úsala. Si un item tiene [TIENE ARCHIVO ADJUNTO], menciónalo explícitamente como "Tiene un archivo adjunto disponible para descarga". Empieza diciendo "Según la base de datos técnica..." si usas estos datos.\n\n`;
        }
      }

      const finalPrompt = systemContext + userMsg;
      const response = await geminiChat(finalPrompt);
      setMessages(prev => [...prev, { role: 'bot', text: response || "Lo siento, no pude procesar eso." }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'bot', text: "Error de conexión con IA." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[60]">
      {isOpen ? (
        <div className="w-[350px] h-[500px] bg-card-dark border border-white/10 rounded-2xl flex flex-col shadow-2xl overflow-hidden transition-all duration-300">
          <div className="p-4 bg-primary text-black flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined">smart_toy</span>
              <span className="font-bold">EPSA Team Assistant</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-black/10 rounded-full p-1">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
            {messages.length === 0 && (
              <div className="text-center py-10 text-gray-500">
                <span className="material-symbols-outlined text-4xl mb-2">forum</span>
                <p className="text-sm">Ask me about team ops, task prioritization, or engineering questions!</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${m.role === 'user' ? 'bg-primary/20 text-white border border-primary/30 rounded-tr-none' : 'bg-white/5 text-gray-200 border border-white/10 rounded-tl-none'
                  }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/5 p-3 rounded-2xl rounded-tl-none border border-white/10">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce delay-75"></div>
                    <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce delay-150"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-white/5 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={isLoading}
              className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-black hover:bg-primary-hover transition-all shrink-0"
            >
              <span className="material-symbols-outlined">send</span>
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-black shadow-glow hover:scale-110 transition-transform"
        >
          <span className="material-symbols-outlined text-3xl">voice_chat</span>
        </button>
      )}
    </div>
  );
};

export default AIChatbot;
