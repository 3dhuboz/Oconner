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
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1e293b;background:#fff}
  .page{max-width:210mm;margin:0 auto;padding:12mm 14mm}
  .header{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #0f172a;padding-bottom:10px;margin-bottom:14px}
  .brand{font-size:22px;font-weight:900;letter-spacing:-0.5px;color:#0f172a}
  .brand span{color:#f59e0b}
  .header-meta{text-align:right;font-size:11px;color:#64748b;line-height:1.8}
  h2{font-size:13px;font-weight:800;color:#0f172a;margin-bottom:8px;border-left:4px solid #f59e0b;padding-left:8px}
  .section{margin-bottom:16px}
  .field-row{display:flex;gap:10px;margin-bottom:7px;flex-wrap:wrap}
  .field{flex:1;min-width:120px}
  .field label{display:block;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px}
  .field input,.field textarea,.field select{width:100%;border:1.5px solid #cbd5e1;border-radius:5px;padding:5px 8px;font-size:12px;font-family:Arial,sans-serif;background:#fff;color:#0f172a;outline:none}
  .field input:focus,.field textarea:focus{border-color:#f59e0b}
  .field textarea{resize:vertical;min-height:58px}
  .check-group{display:flex;flex-wrap:wrap;gap:6px 18px;margin-top:5px}
  .check-item{display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;user-select:none}
  .check-item input[type=checkbox]{width:15px;height:15px;cursor:pointer;accent-color:#0f172a}
  .materials-table{width:100%;border-collapse:collapse;font-size:12px}
  .materials-table th{background:#f1f5f9;text-align:left;padding:5px 7px;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;border:1px solid #e2e8f0}
  .materials-table td{border:1px solid #e2e8f0;padding:2px 4px}
  .materials-table td input{width:100%;border:none;outline:none;font-size:12px;padding:3px 4px;background:transparent}
  .sig-row{display:flex;gap:14px;margin-top:8px}
  .sig-block{flex:1}
  .sig-line{border-bottom:1.5px solid #334155;height:34px;margin-bottom:3px}
  .footer{margin-top:16px;border-top:1px solid #e2e8f0;padding-top:7px;display:flex;justify-content:space-between}
  .footer-text{font-size:9px;color:#94a3b8}
  .action-bar{display:flex;gap:10px;justify-content:center;margin-top:18px;flex-wrap:wrap}
  .btn{padding:10px 24px;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer}
  .btn-dark{background:#0f172a;color:#fff}
  .btn-amber{background:#f59e0b;color:#0f172a}
  .btn:hover{opacity:0.88}
  .important{background:#fef9c3;border:1px solid #fbbf24;border-radius:6px;padding:7px 11px;font-size:11px;color:#92400e;margin-bottom:14px}
  .instructions{display:flex;gap:12px;margin-bottom:14px;flex-wrap:wrap}
  .instr-box{flex:1;min-width:200px;border-radius:7px;padding:10px 13px;font-size:11.5px;line-height:1.6}
  .instr-box strong{display:block;font-size:12px;margin-bottom:4px}
  .instr-digital{background:#dbeafe;border:1px solid #93c5fd;color:#1e3a5f}
  .instr-print{background:#dcfce7;border:1px solid #86efac;color:#14532d}
  .print-only{display:none}
  @media print{
    body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .no-print{display:none!important}
    .print-only{display:block!important}
    .field input,.field textarea,.field select{border-color:#cbd5e1!important}
  }
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <div>
      <div class="brand">WIREZ<span> R US</span></div>
      <div style="font-size:11px;color:#64748b;margin-top:2px">Licensed Electrical Contractors</div>
    </div>
    <div class="header-meta">
      <strong>WORK ORDER REQUEST</strong><br/>
      Date: ${today}
    </div>
  </div>

  <div class="instructions no-print">
    <div class="instr-box instr-digital">
      <strong>&#128187; Option A — Fill &amp; Submit Online (Recommended)</strong>
      1. Open this file in any web browser (double-click it).<br/>
      2. Fill in all fields on screen.<br/>
      3. Click the <strong>&#9993; Submit by Email</strong> button at the bottom.<br/>
      4. Your email app will open pre-filled &mdash; just hit <strong>Send</strong>.<br/>
      <span style="font-size:10.5px;opacity:0.8">Your job will be created automatically when received.</span>
    </div>
    <div class="instr-box instr-print">
      <strong>&#128438; Option B — Print &amp; Email Back</strong>
      1. Click <strong>&#128438; Print / Save as PDF</strong> below.<br/>
      2. Fill out the printed form by hand.<br/>
      3. Scan or photograph the completed form.<br/>
      4. Email the image/PDF to:<br/>
      <strong style="font-size:12px;display:block;margin-top:3px">jobs@wireznrus.com.au</strong>
      <span style="font-size:10.5px;opacity:0.8">Include property address in the email subject.</span>
    </div>
  </div>

  <div class="print-only" style="border:2px solid #0f172a;border-radius:7px;padding:10px 14px;margin-bottom:14px;background:#f8fafc">
    <strong style="font-size:12px">&#128338; HOW TO SUBMIT THIS COMPLETED FORM</strong>
    <p style="font-size:11px;margin-top:5px;line-height:1.7">
      Once filled in, please <strong>scan or photograph</strong> this form and email it to:<br/>
      <strong style="font-size:13px">jobs@wireznrus.com.au</strong><br/>
      Include the <strong>property address</strong> in the email subject line.<br/>
      We will contact you within 1 business day to confirm scheduling.
    </p>
  </div>

  <div class="section">
    <h2>1. Property &amp; Tenant Details</h2>
    <div class="field-row">
      <div class="field" style="flex:2"><label>Property Address *</label><input id="f_address" type="text" placeholder="123 Main St, Brisbane QLD 4000"/></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Tenant Full Name *</label><input id="f_tenant_name" type="text" placeholder="Jane Smith"/></div>
      <div class="field"><label>Tenant Phone</label><input id="f_tenant_phone" type="tel" placeholder="0412 345 678"/></div>
      <div class="field"><label>Tenant Email</label><input id="f_tenant_email" type="email" placeholder="tenant@email.com"/></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Property Manager Name</label><input id="f_pm_name" type="text" placeholder="John Manager"/></div>
      <div class="field"><label>Property Manager Email *</label><input id="f_pm_email" type="email" placeholder="manager@agency.com.au"/></div>
      <div class="field"><label>Agency Name</label><input id="f_agency" type="text" placeholder="LJ Hooker Brisbane"/></div>
    </div>
  </div>

  <div class="section">
    <h2>2. Job Type <span style="font-size:11px;font-weight:400;color:#64748b">(tick all that apply)</span></h2>
    <div class="check-group">
      <label class="check-item"><input type="checkbox" id="jt_elec"/> Electrical Fault / Repair</label>
      <label class="check-item"><input type="checkbox" id="jt_smoke"/> Smoke Alarm Service</label>
      <label class="check-item"><input type="checkbox" id="jt_emerg"/> Emergency Call-out</label>
      <label class="check-item"><input type="checkbox" id="jt_install"/> Installation</label>
      <label class="check-item"><input type="checkbox" id="jt_inspect"/> Inspection</label>
      <label class="check-item"><input type="checkbox" id="jt_other"/> Other</label>
    </div>
  </div>

  <div class="section">
    <h2>3. Urgency</h2>
    <div class="check-group">
      <label class="check-item"><input type="radio" name="urgency" id="urg_routine" value="Routine" checked/> <strong>Routine</strong> &mdash; 5&ndash;7 business days</label>
      <label class="check-item"><input type="radio" name="urgency" id="urg_urgent" value="Urgent"/> <strong>Urgent</strong> &mdash; 24&ndash;48 hours</label>
      <label class="check-item"><input type="radio" name="urgency" id="urg_emerg" value="Emergency"/> <strong>Emergency</strong> &mdash; Immediate</label>
    </div>
  </div>

  <div class="section">
    <h2>4. Description of Issue *</h2>
    <div class="field"><textarea id="f_description" rows="4" placeholder="Describe the issue in detail. Include when it started, any hazards, and any history..."></textarea></div>
  </div>

  <div class="section">
    <h2>5. Access Instructions</h2>
    <div class="field-row">
      <div class="field" style="flex:2"><label>Key / Lockbox / Code Details</label><input id="f_access" type="text" placeholder="e.g. Lockbox code 1234, left side of front door"/></div>
    </div>
    <div class="check-group" style="margin-top:6px">
      <label class="check-item"><input type="checkbox" id="ac_lockbox"/> Lockbox on site</label>
      <label class="check-item"><input type="checkbox" id="ac_agency"/> Key at agency</label>
      <label class="check-item"><input type="checkbox" id="ac_tenant"/> Tenant to provide access</label>
      <label class="check-item"><input type="checkbox" id="ac_agent"/> Agent to attend</label>
    </div>
  </div>

  <div class="section">
    <h2>6. Preferred Attendance Time</h2>
    <div class="field-row">
      <div class="field"><label>Preferred Date / Window</label><input id="f_preferred_date" type="text" placeholder="e.g. Any weekday morning, or Mon 3 March after 10am"/></div>
      <div class="field"><label>Dates / Times NOT Available</label><input id="f_not_available" type="text" placeholder="e.g. No Fridays, not before 9am"/></div>
    </div>
  </div>

  <div class="section">
    <h2>7. Declaration</h2>
    <p style="font-size:11px;color:#475569;margin-bottom:8px;line-height:1.5">
      I confirm the information provided is accurate and I am authorised to request these works on behalf of the property owner / occupant.
    </p>
    <div class="sig-row">
      <div class="sig-block"><div class="sig-line"></div><div style="font-size:10px;color:#64748b">Signature</div></div>
      <div class="sig-block"><div class="sig-line"></div><div style="font-size:10px;color:#64748b">Printed Name</div></div>
      <div class="sig-block" style="flex:0.5"><div class="sig-line"></div><div style="font-size:10px;color:#64748b">Date</div></div>
    </div>
  </div>

  <div class="footer">
    <div class="footer-text">Wirez R Us Electrical Services &bull; Licensed Electrical Contractors &bull; jobs@wireznrus.com.au</div>
    <div class="footer-text">Form generated ${today}</div>
  </div>

  <div class="action-bar no-print">
    <button class="btn btn-amber" onclick="submitByEmail()">&#9993; Submit by Email</button>
    <button class="btn btn-dark" onclick="window.print()">&#128438; Print / Save as PDF</button>
    <button class="btn" style="background:#6366f1;color:#fff" onclick="forwardForm()">&#128279; Send Form to Someone</button>
  </div>

</div>

<script>
function getChecked(ids) {
  return ids.filter(id => document.getElementById(id) && document.getElementById(id).checked)
            .map(id => document.getElementById(id).parentElement.textContent.trim())
            .join(', ') || 'None selected';
}
function val(id) {
  var el = document.getElementById(id);
  return el ? el.value.trim() : '';
}
function submitByEmail() {
  var address   = val('f_address');
  var tenantName  = val('f_tenant_name');
  var tenantPhone = val('f_tenant_phone');
  var tenantEmail = val('f_tenant_email');
  var pmName    = val('f_pm_name');
  var pmEmail   = val('f_pm_email');
  var agency    = val('f_agency');
  var description = val('f_description');
  var access    = val('f_access');
  var prefDate  = val('f_preferred_date');
  var notAvail  = val('f_not_available');

  if (!address || !tenantName || !description) {
    alert('Please fill in Property Address, Tenant Name, and Description before submitting.');
    return;
  }

  var jobTypes = getChecked(['jt_elec','jt_smoke','jt_emerg','jt_install','jt_inspect','jt_other']);
  var urgencyEl = document.querySelector('input[name=urgency]:checked');
  var urgency = urgencyEl ? urgencyEl.value : 'Routine';
  var accessTypes = getChecked(['ac_lockbox','ac_agency','ac_tenant','ac_agent']);

  var subject = encodeURIComponent('Work Order Request — ' + address);
  var body = encodeURIComponent(
    'WIREZ R US — WORK ORDER REQUEST\n' +
    '=====================================\n' +
    '\n' +
    'PROPERTY ADDRESS: ' + address + '\n' +
    '\n' +
    'TENANT NAME: ' + tenantName + '\n' +
    'TENANT PHONE: ' + (tenantPhone || 'N/A') + '\n' +
    'TENANT EMAIL: ' + (tenantEmail || 'N/A') + '\n' +
    '\n' +
    'PROPERTY MANAGER: ' + (pmName || 'N/A') + '\n' +
    'PROPERTY MANAGER EMAIL: ' + (pmEmail || 'N/A') + '\n' +
    'AGENCY: ' + (agency || 'N/A') + '\n' +
    '\n' +
    'JOB TYPE: ' + jobTypes + '\n' +
    'URGENCY: ' + urgency + '\n' +
    '\n' +
    'DESCRIPTION OF ISSUE:\n' +
    description + '\n' +
    '\n' +
    'ACCESS INSTRUCTIONS: ' + (access || 'N/A') + '\n' +
    'ACCESS TYPE: ' + accessTypes + '\n' +
    '\n' +
    'PREFERRED DATE/TIME: ' + (prefDate || 'Flexible') + '\n' +
    'NOT AVAILABLE: ' + (notAvail || 'N/A') + '\n' +
    '\n' +
    '=====================================\n' +
    'Submitted via Wirez R Us Work Order Form — ' + new Date().toLocaleDateString('en-AU')
  );

  window.location.href = 'mailto:e35a378a68a971a219eb@cloudmailin.net?subject=' + subject + '&body=' + body;
}
function forwardForm() {
  var subject = encodeURIComponent('Wirez R Us — Work Order Request Form');
  var body = encodeURIComponent(
    'Hi,\n\n' +
    'Please find attached the Wirez R Us Work Order Request Form.\n\n' +
    'HOW TO COMPLETE THIS FORM:\n' +
    '\n' +
    'OPTION A — Online (easiest):\n' +
    '  1. Save the attached .html file to your computer.\n' +
    '  2. Double-click it to open in your web browser.\n' +
    '  3. Fill in all the fields on screen.\n' +
    '  4. Click the "Submit by Email" button — your email app will open pre-filled.\n' +
    '  5. Hit Send. We will take care of the rest!\n' +
    '\n' +
    'OPTION B — Print & Email Back:\n' +
    '  1. Open the attached file and click "Print / Save as PDF".\n' +
    '  2. Fill out the printed form by hand.\n' +
    '  3. Scan or photograph the completed form.\n' +
    '  4. Email it to: jobs@wireznrus.com.au\n' +
    '     (Include the property address in the subject line.)\n' +
    '\n' +
    'We will be in touch within 1 business day to confirm scheduling.\n\n' +
    'Regards,\nWirez R Us\njobs@wireznrus.com.au'
  );
  window.location.href = 'mailto:?subject=' + subject + '&body=' + body;
}
</script>
</body>
</html>`;
              const blob = new Blob([html], { type: 'text/html' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `work_order_form_${today.replace(/\//g, '-')}.html`;
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
