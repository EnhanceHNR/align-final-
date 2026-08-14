
import React, { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, User, Shield, Stethoscope, X } from 'lucide-react';
import { ChatMessage, UserProfile, UserRole } from '../types';

interface ClinicianTrailProps {
  messages: ChatMessage[];
  currentUser: UserProfile;
  onSendMessage: (text: string, image?: string) => void;
}

const ClinicianTrail: React.FC<ClinicianTrailProps> = ({ messages, currentUser, onSendMessage }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin': return <Shield size={12} className="text-amber-500" />;
      case 'clinician': return <Stethoscope size={12} className="text-emerald-500" />;
      default: return <User size={12} className="text-sky-500" />;
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-sky-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all z-50 border-4 border-white"
      >
        <ImageIcon size={24} />
        {messages.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full border-2 border-white">
            {messages.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-[2.5rem] shadow-2xl z-50 flex flex-col overflow-hidden border border-slate-200 animate-fade-in">
      <div className="p-5 bg-slate-900 text-white flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <ImageIcon size={18} className="text-sky-400" />
          <h3 className="font-bold text-sm tracking-tight">Project Trail & Feedback</h3>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
          <X size={20} />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.senderId === currentUser.id ? 'items-end' : 'items-start'}`}>
            <div className="flex items-center space-x-1 mb-1 px-1">
              {getRoleIcon(msg.senderRole)}
              <span className="text-[10px] font-bold text-slate-500 uppercase">{msg.senderName}</span>
            </div>
            <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm ${
              msg.senderId === currentUser.id ? 'bg-sky-600 text-white rounded-tr-none' : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'
            }`}>
              {msg.text}
              {msg.imageUrl && (
                <img src={msg.imageUrl} alt="attached" className="mt-2 rounded-lg w-full object-cover border border-black/10" />
              )}
            </div>
            <span className="text-[8px] text-slate-400 mt-1">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          </div>
        ))}
      </div>

      <div className="p-4 bg-white border-t border-slate-100 flex items-center space-x-2">
        <button className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-full transition-all">
          <ImageIcon size={20} />
        </button>
        <input 
          type="text" 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Enter report notes..."
          className="flex-1 bg-slate-100 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-sky-500/20"
        />
        <button 
          onClick={handleSend}
          className="p-2 bg-sky-600 text-white rounded-full hover:bg-sky-700 shadow-md shadow-sky-100"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

export default ClinicianTrail;
