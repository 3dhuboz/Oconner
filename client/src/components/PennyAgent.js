import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, X, Send, Bot, User, ArrowRight, ExternalLink } from 'lucide-react';
import './PennyAgent.css';

const SOLUTIONS = [
  {
    keywords: ['social', 'media', 'post', 'facebook', 'instagram', 'content', 'schedule', 'marketing', 'brand'],
    app: 'SocialAI Studio',
    slug: 'social-ai-studio',
    route: '/social-ai',
    description: 'Our AI-powered social media tool generates on-brand content, images, and full 2-week posting schedules for Facebook and Instagram — all white-labelled under your brand.',
    price: 'From $49/mo'
  },
  {
    keywords: ['food', 'truck', 'restaurant', 'catering', 'menu', 'order', 'ordering', 'kitchen', 'bbq', 'takeaway', 'delivery', 'loyalty'],
    app: 'Food Truck',
    slug: 'foodtruc',
    route: '/foodtruc',
    description: 'A complete mobile ordering platform for food trucks, caterers, and pop-up kitchens. Online ordering, payments, loyalty rewards, and admin dashboard — all white-labelled as yours.',
    price: 'From $79/mo'
  },
  {
    keywords: ['car', 'vehicle', 'photo', 'colour', 'color', 'sort', 'dealership', 'automotive', 'auction', 'inventory', 'image'],
    app: 'AutoHue',
    slug: 'autohue',
    route: '/autohue',
    demo: 'https://autohue.vercel.app',
    description: 'AI-powered car photo colour sorter. Upload vehicle photos and our AI detects cars, identifies colours, and sorts them into organised folders instantly.',
    price: 'From $29/mo'
  }
];

const GREETINGS = [
  { role: 'agent', text: "G'day! I'm Penny, your AI assistant at Penny Wise I.T. 👋" },
  { role: 'agent', text: "I can help you find the right solution for your business. What challenge are you facing today?", options: [
    { label: 'I need help with social media', value: 'I need help managing social media content' },
    { label: 'I need an ordering system', value: 'I need a food ordering and delivery system' },
    { label: 'I need to sort car photos', value: 'I need to sort car photos by colour' },
    { label: 'I need a custom solution', value: 'I need a custom app or website built' },
    { label: 'I want to browse your apps', value: 'Show me your marketplace apps' }
  ]}
];

function findSolution(text) {
  const lower = text.toLowerCase();
  let bestMatch = null;
  let bestScore = 0;
  for (const sol of SOLUTIONS) {
    const score = sol.keywords.filter(k => lower.includes(k)).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = sol;
    }
  }
  return bestScore > 0 ? bestMatch : null;
}

function generateResponse(text) {
  const lower = text.toLowerCase();

  // Check for marketplace/browse intent
  if (lower.includes('marketplace') || lower.includes('browse') || lower.includes('apps') || lower.includes('show me')) {
    return {
      messages: [
        { role: 'agent', text: "Here are our ready-to-go white-label solutions — each one can be set up under your own brand:" },
        { role: 'agent', text: "🎨 **AutoHue** — AI car photo colour sorter ($29/mo)\n📱 **Food Truck** — Mobile ordering platform ($79/mo)\n✨ **SocialAI Studio** — AI social media manager ($49/mo)", link: { to: '/marketplace', label: 'Browse Marketplace' } }
      ]
    };
  }

  // Check for custom/website/app build intent
  if (lower.includes('custom') || lower.includes('website') || lower.includes('build') || lower.includes('workflow') || lower.includes('app') || lower.includes('develop')) {
    return {
      messages: [
        { role: 'agent', text: "Absolutely — that's our specialty! We use cutting-edge AI-assisted development to build custom apps, websites, and workflow systems tailored to your exact needs." },
        { role: 'agent', text: "Every project starts with understanding your problem. Tell us what you need and we'll design the smartest solution — no cookie-cutter templates.", link: { to: '/contact', label: 'Get in Touch' }, showContact: true }
      ]
    };
  }

  // Check for pricing intent
  if (lower.includes('price') || lower.includes('cost') || lower.includes('how much') || lower.includes('pricing')) {
    return {
      messages: [
        { role: 'agent', text: "Great question! Our white-label apps include a one-time setup fee plus a monthly subscription:\n\n• **AutoHue**: $199 setup + from $29/mo\n• **SocialAI Studio**: $299 setup + from $49/mo\n• **Food Truck**: $499 setup + from $79/mo\n\nYearly plans get 2 months free! Each includes your own branded instance with admin access." },
        { role: 'agent', text: "For custom builds, pricing depends on scope. We'll give you a clear quote after understanding your needs.", link: { to: '/marketplace', label: 'View All Plans' } }
      ]
    };
  }

  // Check for specific solution match
  const solution = findSolution(text);
  if (solution) {
    const msgs = [
      { role: 'agent', text: `Sounds like **${solution.app}** could be exactly what you need! ${solution.description}` },
      { role: 'agent', text: `**${solution.price}** + a one-time setup fee. It'll be fully white-labelled — your brand, your domain, your customers.`, link: { to: solution.route, label: `Learn More About ${solution.app}` } }
    ];
    if (solution.demo) {
      msgs[1].demoLink = { href: solution.demo, label: 'Try Live Demo' };
    }
    return { messages: msgs };
  }

  // Fallback — custom solution + contact
  return {
    messages: [
      { role: 'agent', text: "That's an interesting challenge! While we don't have a ready-made solution for that specific need, building custom apps is exactly what we do." },
      { role: 'agent', text: "We use AI-assisted development to build solutions fast — from workflow automation to full web apps. Let's chat about what you need and we'll put together a plan.", link: { to: '/contact', label: 'Tell Us Your Problem' }, showContact: true }
    ]
  };
}

const PennyAgent = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const openChat = () => {
    setIsOpen(true);
    if (!hasOpened) {
      setHasOpened(true);
      // Show greeting messages with typing delay
      setIsTyping(true);
      setTimeout(() => {
        setMessages([GREETINGS[0]]);
        setTimeout(() => {
          setMessages(prev => [...prev, GREETINGS[1]]);
          setIsTyping(false);
        }, 800);
      }, 500);
    }
    setTimeout(() => inputRef.current?.focus(), 300);
  };

  const handleSend = (text) => {
    if (!text?.trim()) return;
    const userMsg = { role: 'user', text: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    const response = generateResponse(text);
    let delay = 600;
    response.messages.forEach((msg, i) => {
      setTimeout(() => {
        setMessages(prev => [...prev, msg]);
        if (i === response.messages.length - 1) setIsTyping(false);
      }, delay);
      delay += 800;
    });
  };

  const handleOptionClick = (value) => {
    handleSend(value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSend(input);
  };

  return (
    <div className="penny-agent">
      {/* Chat Window */}
      {isOpen && (
        <div className="pa-window">
          <div className="pa-header">
            <div className="pa-header-left">
              <img src="/logo.png" alt="Penny Wise I.T" className="pa-header-logo" />
              <div>
                <strong>Penny</strong>
                <span className="pa-status">AI Assistant</span>
              </div>
            </div>
            <button className="pa-close" onClick={() => setIsOpen(false)}><X size={18} /></button>
          </div>

          <div className="pa-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`pa-msg pa-msg-${msg.role}`}>
                <div className="pa-msg-icon">
                  {msg.role === 'agent' ? <Bot size={14} /> : <User size={14} />}
                </div>
                <div className="pa-msg-content">
                  <div className="pa-msg-text" dangerouslySetInnerHTML={{
                    __html: msg.text
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\n/g, '<br/>')
                  }} />
                  {msg.options && (
                    <div className="pa-options">
                      {msg.options.map((opt, j) => (
                        <button key={j} className="pa-option-btn" onClick={() => handleOptionClick(opt.value)}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {msg.link && (
                    <Link to={msg.link.to} className="pa-link-btn" onClick={() => setIsOpen(false)}>
                      {msg.link.label} <ArrowRight size={14} />
                    </Link>
                  )}
                  {msg.demoLink && (
                    <a href={msg.demoLink.href} target="_blank" rel="noopener noreferrer" className="pa-demo-btn">
                      {msg.demoLink.label} <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="pa-msg pa-msg-agent">
                <div className="pa-msg-icon"><Bot size={14} /></div>
                <div className="pa-msg-content">
                  <div className="pa-typing"><span></span><span></span><span></span></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="pa-input-area" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type your question..."
              className="pa-input"
            />
            <button type="submit" className="pa-send" disabled={!input.trim()}>
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      {/* Floating Button */}
      <button className={`pa-fab ${isOpen ? 'pa-fab-hidden' : ''}`} onClick={openChat}>
        <MessageCircle size={24} />
        <span className="pa-fab-pulse"></span>
      </button>
    </div>
  );
};

export default PennyAgent;
