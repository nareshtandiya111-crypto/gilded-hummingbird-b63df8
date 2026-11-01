import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import { Smartphone, MapPin, ShieldCheck, Wrench, ClipboardList, Users, IndianRupee, Menu, X, ArrowRight, CheckCircle2, Clock, Phone, LogIn, LogOut, RefreshCw } from 'lucide-react';
import './styles.css';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const money = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(n || 0));
const blankBooking = { customer_name: '', phone: '', address: '', city: '', state: '', pincode: '', brand: 'Samsung', model: '', issue: 'Combo / Display टूट गया', preferred_date: '', notes: '' };

function App() {
  const [page, setPage] = useState('home');
  const [menu, setMenu] = useState(false);
  const [booking, setBooking] = useState(blankBooking);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState(null);
  const [role, setRole] = useState('customer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetStep, setResetStep] = useState('email');
  const [myOrders, setMyOrders] = useState([]);
  const [adminOrders, setAdminOrders] = useState([]);
  const [agentProfile, setAgentProfile] = useState({ full_name: '', phone: '', city: '', state: '', pincode: '', experience: '', notes: '' });
  const [commissionRate, setCommissionRate] = useState('10');
  const [adminStats, setAdminStats] = useState({ orders: 0, agents: 0, commission: 0 });

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session && page === 'orders') loadMyOrders();
    if (session && page === 'admin') loadAdmin();
  }, [session, page]);

  const go = p => { setPage(p); setMenu(false); setNotice(''); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const updateBooking = e => setBooking({ ...booking, [e.target.name]: e.target.value });
  const updateAgent = e => setAgentProfile({ ...agentProfile, [e.target.name]: e.target.value });

  async function submitBooking(e) {
    e.preventDefault(); setNotice('');
    if (!booking.phone.match(/^[6-9]\d{9}$/)) return setNotice('कृपया 10 अंकों का सही भारतीय मोबाइल नंबर भरें।');
    if (!/^\d{6}$/.test(booking.pincode)) return setNotice('कृपया 6 अंकों का पिन कोड भरें।');
    if (!supabase) return setNotice('डेमो मोड: वेबसाइट का फॉर्म तैयार है। असली बुकिंग सेव करने के लिए पहले Supabase सेटअप करें।');
    setBusy(true);
    const { error } = await supabase.from('bookings').insert({
      customer_name: booking.customer_name, phone: booking.phone, address: booking.address,
      city: booking.city, state: booking.state, pincode: booking.pincode,
      brand: booking.brand, model: booking.model, issue: booking.issue,
      preferred_date: booking.preferred_date || null, notes: booking.notes,
      status: 'pending', payment_status: 'pending'
    });
    setBusy(false);
    if (error) return setNotice('बुकिंग सेव नहीं हुई: ' + error.message);
    setBooking(blankBooking); setNotice('बुकिंग सफलतापूर्वक दर्ज हुई! हमारी टीम उपलब्ध एजेंट की पुष्टि करेगी।'); go('home');
  }

  async function signIn(e) {
    e.preventDefault(); setNotice('');
    if (!supabase) return setNotice('लॉगिन चालू करने के लिए .env में Supabase URL और key सेट करें।');
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setNotice('लॉगिन नहीं हुआ: ' + error.message);
    else { setNotice('लॉगिन सफल।'); go(role === 'admin' ? 'admin' : role === 'agent' ? 'agent' : 'orders'); }
  }

  async function sendResetOtp(e) {
    e.preventDefault(); setNotice('');
    if (!supabase) return setNotice('पासवर्ड रीसेट के लिए पहले Supabase URL और Publishable Key सेट करें।');
    if (!resetEmail.trim()) return setNotice('अपना रजिस्टर्ड ईमेल भरें।');
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
      options: { redirectTo: window.location.origin }
    });
    setBusy(false);
    if (error) return setNotice('OTP नहीं भेजा गया: ' + error.message);
    setResetStep('otp');
    setNotice('अगर यह ईमेल रजिस्टर्ड है, तो पासवर्ड रीसेट कोड भेज दिया गया है।');
  }

  async function verifyResetOtp(e) {
    e.preventDefault(); setNotice('');
    if (!supabase) return setNotice('Supabase सेटअप आवश्यक है।');
    if (!/^\\d{6}$/.test(resetOtp.trim())) return setNotice('ईमेल पर आया 6 अंकों का OTP भरें।');
    if (newPassword.length < 8) return setNotice('नया पासवर्ड कम से कम 8 अक्षरों का रखें।');
    setBusy(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: resetEmail.trim(),
      token: resetOtp.trim(),
      type: 'recovery'
    });
    if (verifyError) {
      setBusy(false);
      return setNotice('OTP सही नहीं है या उसकी अवधि समाप्त हो गई है: ' + verifyError.message);
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(false);
    if (updateError) return setNotice('पासवर्ड अपडेट नहीं हुआ: ' + updateError.message);
    setPassword('');
    setResetOtp('');
    setNewPassword('');
    setResetStep('email');
    setNotice('पासवर्ड सफलतापूर्वक बदल गया। अब नए पासवर्ड से लॉगिन करें।');
    go('login');
  }

  async function signUpAgent(e) {
    e.preventDefault(); setNotice('');
    if (!supabase) return setNotice('एजेंट आवेदन सेव करने के लिए पहले Supabase सेटअप करें।');
    if (!agentProfile.phone.match(/^[6-9]\d{9}$/)) return setNotice('10 अंकों का सही मोबाइल नंबर भरें।');
    setBusy(true);
    const { data, error } = await supabase.from('agent_applications').insert({ ...agentProfile, status: 'pending' }).select('id').single();
    setBusy(false);
    if (error) return setNotice('आवेदन सेव नहीं हुआ: ' + error.message);
    setAgentProfile({ full_name: '', phone: '', city: '', state: '', pincode: '', experience: '', notes: '' });
    setNotice('आवेदन भेज दिया गया। Admin की जाँच और मंजूरी के बाद आप काम ले सकेंगे।');
  }

  async function loadMyOrders() {
    if (!supabase || !session?.user?.email) return;
    const { data, error } = await supabase.from('bookings').select('id,created_at,brand,model,issue,city,pincode,status,payment_status,total_amount').eq('customer_email', session.user.email).order('created_at', { ascending: false });
    if (!error) setMyOrders(data || []);
  }

  async function loadAdmin() {
    if (!supabase) return;
    const { data, error } = await supabase.from('admin_booking_summary').select('*').order('created_at', { ascending: false }).limit(100);
    if (!error) {
      setAdminOrders(data || []);
      setAdminStats({
        orders: data?.length || 0,
        agents: new Set((data || []).map(x => x.agent_id).filter(Boolean)).size,
        commission: (data || []).reduce((sum, x) => sum + Number(x.admin_commission || 0), 0)
      });
    } else setNotice('Admin डेटा नहीं मिला। SQL सेटअप और Admin role जाँचें।');
  }

  async function updateOrderStatus(id, status) {
    if (!supabase) return;
    const { error } = await supabase.from('bookings').update({ status }).eq('id', id);
    if (error) setNotice('स्टेटस अपडेट नहीं हुआ: ' + error.message);
    else { setNotice('ऑर्डर स्टेटस अपडेट हो गया।'); loadAdmin(); }
  }

  async function logout() {
    if (supabase) await supabase.auth.signOut();
    setSession(null); go('home');
  }

  const navItems = [
    ['home', 'होम'], ['book', 'बुकिंग करें'], ['agent-join', 'एजेंट बनें'],
    ...(session ? [['orders', 'मेरे ऑर्डर']] : []),
    ...(session ? [['agent', 'एजेंट पैनल']] : []),
    ...(session ? [['admin', 'Admin']] : [])
  ];

  return <div className="app-shell">
    <header className="topbar">
      <button className="brand" onClick={() => go('home')} aria-label="होम">
        <span className="brand-icon"><Smartphone size={25}/></span>
        <span><strong>Combo Change</strong><small>FROM HOME · INDIA</small></span>
      </button>
      <button className="menu-btn" onClick={() => setMenu(!menu)} aria-label="मेन्यू">{menu ? <X/> : <Menu/>}</button>
      <nav className={menu ? 'nav open' : 'nav'}>
        {navItems.map(([p, label]) => <button key={p} className={page === p ? 'nav-link active' : 'nav-link'} onClick={() => go(p)}>{label}</button>)}
        {session ? <button className="nav-login" onClick={logout}><LogOut size={16}/> लॉगआउट</button> : <button className="nav-login" onClick={() => go('login')}><LogIn size={16}/> लॉगिन</button>}
      </nav>
    </header>

    {notice && <div className="notice" role="status"><span>{notice}</span><button onClick={() => setNotice('')}><X size={16}/></button></div>}

    {page === 'home' && <main>
      <section className="hero">
        <div className="hero-copy">
          <div className="pill"><span className="pulse"></span> आपके घर पर मोबाइल रिपेयरिंग</div>
          <h1>मोबाइल का कॉम्बो बदलवाएँ,<br/><em>घर बैठे आराम से।</em></h1>
          <p>घर पर मोबाइल डिस्प्ले और कॉम्बो रिपेयर बुक करें। अपने क्षेत्र में उपलब्ध सत्यापित एजेंट से सर्विस पाएँ।</p>
          <div className="hero-actions"><button className="btn primary" onClick={() => go('book')}>अभी बुकिंग करें <ArrowRight size={18}/></button><button className="btn secondary" onClick={() => go('agent-join')}>एजेंट बनें</button></div>
          <div className="trust-row"><span><ShieldCheck size={17}/> सत्यापित एजेंट</span><span><MapPin size={17}/> पिन कोड आधारित सेवा</span></div>
        </div>
        <div className="hero-visual"><div className="orb orb-one"></div><div className="phone-card"><div className="phone-notch"></div><div className="phone-screen"><div className="screen-check"><CheckCircle2 size={42}/></div><strong>Repair booked!</strong><span>आपकी सुविधा, आपके घर पर</span><div className="screen-lines"><i></i><i></i><i></i></div></div><div className="tool-badge"><Wrench size={22}/></div><div className="home-badge">⌂ <span>At Home</span></div></div><div className="float-card"><span className="float-icon"><Clock size={18}/></span><span><b>आसान बुकिंग</b><small>कुछ ही मिनटों में</small></span></div></div>
      </section>
      <section className="stats-strip"><div><b>01</b><span>बुकिंग करें</span></div><ArrowRight/><div><b>02</b><span>एजेंट कन्फर्म होगा</span></div><ArrowRight/><div><b>03</b><span>घर पर रिपेयर</span></div></section>
      <section className="section"><div className="section-heading"><span className="eyebrow">हमारी सर्विस</span><h2>मोबाइल रिपेयरिंग अब आसान</h2><p>अपनी जरूरत चुनें और घर से बुकिंग शुरू करें।</p></div><div className="service-grid">
        {[['▣','कॉम्बो / डिस्प्ले','टूटा या खराब मोबाइल डिस्प्ले बदलवाएँ।'],['◉','टच स्क्रीन','टच काम नहीं कर रहा? जाँच करवाएँ।'],['⌁','मोबाइल जाँच','समस्या की शुरुआती जाँच और सलाह।']].map(([icon,title,desc])=><article className="service-card" key={title}><div className="service-icon">{icon}</div><h3>{title}</h3><p>{desc}</p><button onClick={() => go('book')}>बुकिंग करें <ArrowRight size={16}/></button></article>)}
      </div></section>
      <section className="cta"><div><span className="eyebrow light">REPAIR PARTNER NETWORK</span><h2>मोबाइल रिपेयरिंग करते हैं?</h2><p>अपने शहर में एजेंट बनें और बुकिंग के जरिए नए ग्राहक पाएँ।</p></div><button className="btn white" onClick={() => go('agent-join')}>एजेंट आवेदन करें <ArrowRight size={18}/></button></section>
    </main>}

    {page === 'book' && <main className="page-wrap"><div className="page-heading"><span className="eyebrow">HOME SERVICE</span><h1>मोबाइल रिपेयर बुक करें</h1><p>सही जानकारी भरें ताकि आपके क्षेत्र में उपलब्ध एजेंट की पुष्टि की जा सके।</p></div><form className="form-card" onSubmit={submitBooking}>
      <h2><ClipboardList/> बुकिंग की जानकारी</h2>
      <div className="form-grid">
        <label>आपका नाम *<input required name="customer_name" value={booking.customer_name} onChange={updateBooking} placeholder="पूरा नाम"/></label>
        <label>मोबाइल नंबर *<input required inputMode="numeric" maxLength="10" name="phone" value={booking.phone} onChange={updateBooking} placeholder="10 अंकों का नंबर"/></label>
        <label>मोबाइल कंपनी *<select name="brand" value={booking.brand} onChange={updateBooking}>{['Samsung','Vivo','Oppo','Xiaomi / Redmi','Realme','iPhone','Motorola','OnePlus','अन्य'].map(x=><option key={x}>{x}</option>)}</select></label>
        <label>मोबाइल मॉडल *<input required name="model" value={booking.model} onChange={updateBooking} placeholder="जैसे Redmi Note 12"/></label>
        <label>समस्या *<select name="issue" value={booking.issue} onChange={updateBooking}>{['Combo / Display टूट गया','टच काम नहीं कर रहा','डिस्प्ले पर लाइन','डिस्प्ले काला है','अन्य समस्या'].map(x=><option key={x}>{x}</option>)}</select></label>
        <label>पसंदीदा तारीख<input type="date" min={new Date().toISOString().slice(0,10)} name="preferred_date" value={booking.preferred_date} onChange={updateBooking}/></label>
        <label className="full">पूरा पता *<textarea required name="address" value={booking.address} onChange={updateBooking} placeholder="मकान नंबर, गली, लैंडमार्क" rows="2"/></label>
        <label>शहर *<input required name="city" value={booking.city} onChange={updateBooking} placeholder="शहर"/></label>
        <label>राज्य *<input required name="state" value={booking.state} onChange={updateBooking} placeholder="राज्य"/></label>
        <label>पिन कोड *<input required inputMode="numeric" maxLength="6" name="pincode" value={booking.pincode} onChange={updateBooking} placeholder="6 अंकों का पिन कोड"/></label>
        <label className="full">अतिरिक्त जानकारी<textarea name="notes" value={booking.notes} onChange={updateBooking} placeholder="मोबाइल की समस्या के बारे में और बताएँ" rows="2"/></label>
      </div>
      <div className="form-note"><ShieldCheck size={18}/> बुकिंग भेजने से पहले पता और मोबाइल नंबर जाँच लें।</div>
      <button className="btn primary submit-btn" disabled={busy}>{busy ? 'कृपया प्रतीक्षा करें…' : 'बुकिंग सबमिट करें'} <ArrowRight size={18}/></button>
    </form></main>}

    {page === 'agent-join' && <main className="page-wrap"><div className="page-heading"><span className="eyebrow">JOIN OUR NETWORK</span><h1>मोबाइल रिपेयर एजेंट बनें</h1><p>अपनी जानकारी भेजें। काम शुरू करने से पहले Admin आपकी जानकारी सत्यापित करेगा।</p></div><form className="form-card" onSubmit={signUpAgent}><h2><Users/> एजेंट आवेदन</h2><div className="form-grid">
      <label>पूरा नाम *<input required name="full_name" value={agentProfile.full_name} onChange={updateAgent} placeholder="आपका नाम"/></label>
      <label>मोबाइल नंबर *<input required maxLength="10" inputMode="numeric" name="phone" value={agentProfile.phone} onChange={updateAgent} placeholder="10 अंकों का नंबर"/></label>
      <label>शहर *<input required name="city" value={agentProfile.city} onChange={updateAgent} placeholder="शहर"/></label>
      <label>राज्य *<input required name="state" value={agentProfile.state} onChange={updateAgent} placeholder="राज्य"/></label>
      <label>पिन कोड *<input required maxLength="6" inputMode="numeric" name="pincode" value={agentProfile.pincode} onChange={updateAgent} placeholder="6 अंकों का पिन कोड"/></label>
      <label>अनुभव *<select required name="experience" value={agentProfile.experience} onChange={updateAgent}><option value="">अनुभव चुनें</option><option>नया हूँ</option><option>1 साल से कम</option><option>1–3 साल</option><option>3 साल से ज्यादा</option></select></label>
      <label className="full">अनुभव / अन्य जानकारी<textarea name="notes" value={agentProfile.notes} onChange={updateAgent} rows="2" placeholder="कौन-कौन से मोबाइल रिपेयर कर सकते हैं?"/></label>
    </div><button className="btn primary submit-btn" disabled={busy}>{busy ? 'भेज रहे हैं…' : 'आवेदन भेजें'} <ArrowRight size={18}/></button></form></main>}

    {page === 'login' && <main className="page-wrap narrow"><div className="page-heading"><span className="eyebrow">SECURE ACCESS</span><h1>लॉगिन करें</h1><p>अपने खाते के अनुसार भूमिका चुनें।</p></div><form className="form-card" onSubmit={signIn}><label>लॉगिन प्रकार<select value={role} onChange={e => setRole(e.target.value)}><option value="customer">ग्राहक</option><option value="agent">एजेंट</option><option value="admin">Admin</option></select></label><label>ईमेल<input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com"/></label><label>पासवर्ड<input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="पासवर्ड"/></label><button className="btn primary submit-btn" disabled={busy}>{busy ? 'लॉगिन हो रहा है…' : 'लॉगिन करें'} <ArrowRight size={18}/></button><button type="button" className="text-button" onClick={() => { setResetEmail(email); setResetStep('email'); go('forgot-password'); }}>पासवर्ड भूल गए? ईमेल OTP से बदलें</button><p className="small-muted">पासवर्ड रीसेट के लिए Supabase Auth और ईमेल टेम्पलेट सेटअप आवश्यक है।</p></form></main>}

    {page === 'forgot-password' && <main className="page-wrap narrow"><div className="page-heading"><span className="eyebrow">ACCOUNT RECOVERY</span><h1>पासवर्ड बदलें</h1><p>रजिस्टर्ड ईमेल पर आए OTP से नया पासवर्ड सेट करें।</p></div>{resetStep === 'email' ? <form className="form-card" onSubmit={sendResetOtp}><label>रजिस्टर्ड ईमेल<input type="email" required value={resetEmail} onChange={e => setResetEmail(e.target.value)} placeholder="name@example.com"/></label><button className="btn primary submit-btn" disabled={busy}>{busy ? 'OTP भेज रहे हैं…' : 'ईमेल पर OTP भेजें'} <ArrowRight size={18}/></button><button type="button" className="text-button" onClick={() => go('login')}>लॉगिन पर वापस जाएँ</button></form> : <form className="form-card" onSubmit={verifyResetOtp}><label>ईमेल OTP<input inputMode="numeric" autoComplete="one-time-code" maxLength="6" required value={resetOtp} onChange={e => setResetOtp(e.target.value.replace(/\\D/g, '').slice(0, 6))} placeholder="6 अंकों का OTP"/></label><label>नया पासवर्ड<input type="password" minLength="8" autoComplete="new-password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="कम से कम 8 अक्षर"/></label><button className="btn primary submit-btn" disabled={busy}>{busy ? 'वेरिफाई कर रहे हैं…' : 'OTP सत्यापित करें और पासवर्ड बदलें'} <ArrowRight size={18}/></button><button type="button" className="text-button" onClick={() => { setResetStep('email'); setResetOtp(''); }}>दूसरा OTP मँगाएँ</button></form>}</main>}

    {page === 'orders' && <main className="page-wrap"><div className="page-heading"><span className="eyebrow">YOUR BOOKINGS</span><h1>मेरे ऑर्डर</h1><p>अपने ऑर्डर की स्थिति देखें।</p></div><div className="form-card"><button className="btn secondary" onClick={loadMyOrders}><RefreshCw size={16}/> रीफ्रेश करें</button>{myOrders.length ? <div className="table-wrap"><table><thead><tr><th>ऑर्डर</th><th>मोबाइल</th><th>शहर</th><th>स्टेटस</th><th>पेमेंट</th></tr></thead><tbody>{myOrders.map(o=><tr key={o.id}><td>{String(o.id).slice(0,8)}</td><td>{o.brand} {o.model}</td><td>{o.city}</td><td><span className="status">{o.status}</span></td><td>{o.payment_status}</td></tr>)}</tbody></table></div> : <div className="empty-state"><ClipboardList size={34}/><h3>अभी कोई ऑर्डर नहीं दिख रहा</h3><p>लॉगिन और ग्राहक ईमेल सत्यापित होने के बाद ऑर्डर यहाँ दिखेंगे।</p><button className="btn primary" onClick={() => go('book')}>नई बुकिंग</button></div>}</div></main>}

    {page === 'agent' && <main className="page-wrap"><div className="page-heading"><span className="eyebrow">AGENT WORKSPACE</span><h1>एजेंट पैनल</h1><p>स्वीकृत एजेंट अपनी बुकिंग और कमाई यहाँ देखेंगे।</p></div><div className="feature-grid"><article className="mini-card"><Wrench/><h3>मेरी बुकिंग</h3><p>असाइन किए गए ऑर्डर और काम का स्टेटस।</p></article><article className="mini-card"><IndianRupee/><h3>मेरी कमाई</h3><p>पूरा हुआ काम, पेमेंट और कमीशन विवरण।</p></article><article className="mini-card"><ShieldCheck/><h3>वेरिफिकेशन</h3><p>Admin अप्रूवल के बाद ही ऑर्डर उपलब्ध होंगे।</p></article></div><div className="form-card"><p>एजेंट बुकिंग और पेआउट डैशबोर्ड को सुरक्षित डेटाबेस रोल और असाइनमेंट के बाद जोड़ा जाएगा।</p><button className="btn primary" onClick={() => go('agent-join')}>एजेंट आवेदन करें</button></div></main>}

    {page === 'admin' && <main className="page-wrap"><div className="page-heading"><span className="eyebrow">CONTROL CENTER</span><h1>Admin Dashboard</h1><p>बुकिंग और कमीशन को मैनेज करें।</p></div><div className="admin-stats"><div><span>लोड किए गए ऑर्डर</span><b>{adminStats.orders}</b></div><div><span>असाइन किए एजेंट</span><b>{adminStats.agents}</b></div><div><span>कमीशन योग</span><b>{money(adminStats.commission)}</b></div></div><div className="form-card"><div className="row-between"><h2>ऑर्डर मैनेजमेंट</h2><button className="btn secondary" onClick={loadAdmin}><RefreshCw size={16}/> रीफ्रेश</button></div><div className="table-wrap"><table><thead><tr><th>ऑर्डर</th><th>ग्राहक/पता</th><th>मोबाइल</th><th>कुल</th><th>कमीशन</th><th>स्टेटस</th><th>एक्शन</th></tr></thead><tbody>{adminOrders.map(o=><tr key={o.id}><td>{String(o.id).slice(0,8)}</td><td>{o.customer_name}<small>{o.city}, {o.pincode}</small></td><td>{o.brand} {o.model}</td><td>{money(o.total_amount)}</td><td>{money(o.admin_commission)}</td><td>{o.status}</td><td><select value={o.status} onChange={e => updateOrderStatus(o.id, e.target.value)}><option value="pending">Pending</option><option value="assigned">Assigned</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></td></tr>)}</tbody></table></div><p className="small-muted">सुरक्षा नोट: Admin पेज को सार्वजनिक रखने से पहले database में role-based access control लागू करें। केवल UI छिपाना सुरक्षा नहीं है।</p></div></main>}

    <footer className="footer"><div className="footer-brand"><span className="brand-icon"><Smartphone size={22}/></span><span><strong>Combo Change From Home</strong><small>घर पर मोबाइल रिपेयरिंग सर्विस</small></span></div><div className="footer-links"><button onClick={() => go('book')}>बुकिंग</button><button onClick={() => go('agent-join')}>एजेंट बनें</button><button onClick={() => go('login')}>लॉगिन</button></div><p>© {new Date().getFullYear()} Combo Change From Home · सेवा उपलब्धता स्थानीय एजेंट पर निर्भर है।</p><small>पेमेंट और बुकिंग शुरू करने से पहले नियम, गोपनीयता नीति और ग्राहक सहायता विवरण जोड़ें।</small></footer>
  </div>;
}
createRoot(document.getElementById('root')).render(<App />);
