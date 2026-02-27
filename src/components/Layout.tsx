import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, Calendar, Settings, Zap, Users, Shield, CreditCard, LogOut, Headphones, ExternalLink, MapPin, Menu, X, Package, Download } from 'lucide-react';
import { cn } from '../utils';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['dev', 'admin', 'user'] },
    { name: 'Job Board', path: '/jobs', icon: ClipboardList, roles: ['dev', 'admin', 'user'] },
    { name: 'Calendar', path: '/calendar', icon: Calendar, roles: ['dev', 'admin', 'user'] },
    { name: 'Live Map', path: '/map', icon: MapPin, roles: ['dev', 'admin'] },
    { name: 'Team', path: '/team', icon: Users, roles: ['dev', 'admin'] },
    { name: 'Parts Catalog', path: '/parts', icon: Package, roles: ['dev', 'admin'] },
    { name: 'Integrations', path: '/integrations', icon: Settings, roles: ['dev', 'admin'] },
    { name: 'Billing', path: '/billing', icon: CreditCard, roles: ['dev', 'admin'] },
    { name: 'Dev Console', path: '/admin', icon: Shield, roles: ['dev'] },
  ];

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — hidden on mobile, slide-in when open */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col shrink-0 transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-4 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 p-2 rounded-lg">
              <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-slate-900" />
            </div>
            <span className="text-lg sm:text-xl font-bold tracking-tight">Wirez R Us</span>
          </div>
          {/* Close button on mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-800 text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="flex-1 px-3 sm:px-4 py-4 sm:py-6 space-y-1 sm:space-y-2 overflow-y-auto">
          {navItems.filter(item => item.roles.includes(user.role)).map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            
            return (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl transition-colors",
                  isActive 
                    ? "bg-amber-500/10 text-amber-500" 
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium text-sm sm:text-base">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 sm:p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-3 sm:px-4 py-2 bg-slate-800/50 rounded-xl mb-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold shrink-0">
              {user.name.charAt(0)}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium truncate">{user.name}</span>
              <span className="text-xs text-slate-500 truncate">{user.role}</span>
            </div>
          </div>
          
          <button
            onClick={() => {
              const today = new Date().toLocaleDateString('en-AU');
              const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Work Order — Wirez R Us</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #1e293b; background: #fff; }
  .page { max-width: 210mm; margin: 0 auto; padding: 12mm 14mm; }
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #0f172a; padding-bottom: 10px; margin-bottom: 16px; }
  .brand { font-size: 22px; font-weight: 900; letter-spacing: -0.5px; color: #0f172a; }
  .brand span { color: #f59e0b; }
  .header-meta { text-align: right; font-size: 11px; color: #64748b; line-height: 1.8; }
  h2 { font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 10px; border-left: 4px solid #f59e0b; padding-left: 8px; }
  .section { margin-bottom: 18px; }
  .field-row { display: flex; gap: 12px; margin-bottom: 8px; }
  .field { flex: 1; }
  .field label { display: block; font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
  .line { border-bottom: 1.5px solid #cbd5e1; min-height: 22px; }
  .check-group { display: flex; flex-wrap: wrap; gap: 8px 20px; margin-top: 6px; }
  .check-item { display: flex; align-items: center; gap: 6px; font-size: 13px; }
  .box { width: 16px; height: 16px; border: 2px solid #334155; border-radius: 3px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .textarea-box { border: 1.5px solid #cbd5e1; border-radius: 6px; min-height: 60px; width: 100%; background: #f8fafc; }
  .sig-row { display: flex; gap: 16px; margin-top: 8px; }
  .sig-block { flex: 1; }
  .sig-line { border-bottom: 1.5px solid #334155; height: 36px; margin-bottom: 4px; }
  .footer { margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 8px; display: flex; justify-content: space-between; }
  .footer-text { font-size: 9px; color: #94a3b8; }
  .materials-table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .materials-table th { background: #f1f5f9; text-align: left; padding: 6px 8px; font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; border: 1px solid #e2e8f0; }
  .materials-table td { padding: 6px 8px; border: 1px solid #e2e8f0; height: 28px; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="brand">WIREZ<span> R US</span></div>
      <div style="font-size:11px;color:#64748b;margin-top:2px;">Licensed Electrical Contractors</div>
    </div>
    <div class="header-meta">
      <strong>WORK ORDER</strong><br/>
      WO#: ____________________<br/>
      Date: ${today}<br/>
      Tech: ____________________
    </div>
  </div>

  <div class="section">
    <h2>1. Property &amp; Tenant</h2>
    <div class="field-row">
      <div class="field" style="flex:2"><label>Property Address</label><div class="line"></div></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Tenant Name</label><div class="line"></div></div>
      <div class="field"><label>Tenant Phone</label><div class="line"></div></div>
      <div class="field"><label>Tenant Email</label><div class="line"></div></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Property Manager</label><div class="line"></div></div>
      <div class="field"><label>PM Phone / Email</label><div class="line"></div></div>
    </div>
  </div>

  <div class="section">
    <h2>2. Job Details</h2>
    <div style="margin-bottom:8px">
      <label style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Job Type</label>
      <div class="check-group">
        <div class="check-item"><div class="box"></div> Electrical Fault / Repair</div>
        <div class="check-item"><div class="box"></div> Smoke Alarm Service</div>
        <div class="check-item"><div class="box"></div> Emergency Call-out</div>
        <div class="check-item"><div class="box"></div> Installation</div>
        <div class="check-item"><div class="box"></div> Inspection</div>
        <div class="check-item"><div class="box"></div> Other: _______________</div>
      </div>
    </div>
    <div style="margin-bottom:8px">
      <label style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Urgency</label>
      <div class="check-group">
        <div class="check-item"><div class="box"></div> <span><strong>Routine</strong> — 5–7 days</span></div>
        <div class="check-item"><div class="box"></div> <span><strong>Urgent</strong> — 24–48 hrs</span></div>
        <div class="check-item"><div class="box"></div> <span><strong>Emergency</strong> — Immediate</span></div>
      </div>
    </div>
    <div>
      <label style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Description of Work</label>
      <div class="textarea-box"></div>
    </div>
  </div>

  <div class="section">
    <h2>3. Access</h2>
    <div class="field-row">
      <div class="field" style="flex:2"><label>Key / Lockbox / Code</label><div class="line"></div></div>
    </div>
    <div class="check-group" style="margin-top:6px">
      <div class="check-item"><div class="box"></div> Lockbox on site</div>
      <div class="check-item"><div class="box"></div> Key at agency</div>
      <div class="check-item"><div class="box"></div> Tenant to provide</div>
      <div class="check-item"><div class="box"></div> Agent attending</div>
    </div>
  </div>

  <div class="section">
    <h2>4. Materials Used</h2>
    <table class="materials-table">
      <thead><tr><th style="width:40%">Item / Part</th><th>Qty</th><th>Unit Cost</th><th>Total</th></tr></thead>
      <tbody>
        <tr><td></td><td></td><td></td><td></td></tr>
        <tr><td></td><td></td><td></td><td></td></tr>
        <tr><td></td><td></td><td></td><td></td></tr>
        <tr><td></td><td></td><td></td><td></td></tr>
        <tr><td></td><td><strong>Labour Hrs:</strong></td><td></td><td></td></tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>5. Site Notes / Findings</h2>
    <div class="textarea-box"></div>
  </div>

  <div class="section">
    <h2>6. Completion &amp; Sign-off</h2>
    <div class="check-group" style="margin-bottom:10px">
      <div class="check-item"><div class="box"></div> Work completed satisfactorily</div>
      <div class="check-item"><div class="box"></div> Follow-up required</div>
      <div class="check-item"><div class="box"></div> Parts on order</div>
      <div class="check-item"><div class="box"></div> Hazard identified — report lodged</div>
    </div>
    <div class="sig-row">
      <div class="sig-block"><div class="sig-line"></div><div style="font-size:10px;color:#64748b;">Technician Signature</div></div>
      <div class="sig-block"><div class="sig-line"></div><div style="font-size:10px;color:#64748b;">Tenant / Occupant Signature</div></div>
      <div class="sig-block" style="flex:0.6"><div class="sig-line"></div><div style="font-size:10px;color:#64748b;">Date Completed</div></div>
    </div>
  </div>

  <div class="footer">
    <div class="footer-text">Wirez R Us Electrical Services &bull; Licensed Electrical Contractors &bull; jobs@wireznrus.com.au</div>
    <div class="footer-text">Generated ${today}</div>
  </div>

  <div class="no-print" style="text-align:center;margin-top:20px">
    <button onclick="window.print()" style="padding:10px 28px;background:#0f172a;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;">&#128438; Print / Save as PDF</button>
  </div>
</div>
</body>
</html>`;
              const blob = new Blob([html], { type: 'text/html' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `work_order_template_${today.replace(/\//g, '-')}.html`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="w-full flex items-center gap-3 px-3 sm:px-4 py-2 text-slate-500 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors text-xs font-medium mb-1"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Work Order Template</span>
          </button>
          <a
            href="https://www.facebook.com/pennywiseitoz"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 px-3 sm:px-4 py-2 text-slate-500 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors text-xs font-medium mb-1"
          >
            <Headphones className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">Support by Penny Wise I.T</span>
            <ExternalLink className="w-3 h-3 ml-auto shrink-0" />
          </a>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 sm:px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-sm font-medium"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden w-full">
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {/* Hamburger menu — mobile only */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-slate-100 text-slate-600"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold text-slate-800 truncate">
              {navItems.find(i => i.path === location.pathname)?.name || 'Wirez R Us CRM'}
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {user.role !== 'user' && (
              <Link to="/jobs/new" className="hidden sm:block px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">
                + New Work Order
              </Link>
            )}
          </div>
        </header>
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
