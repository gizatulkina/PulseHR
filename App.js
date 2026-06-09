import { useState, useEffect, useCallback, useRef } from "react";

// ─── DB LAYER (localStorage-based) ───────────────────────────────────────────
const DB = {
  get: (k) => { try { return JSON.parse(localStorage.getItem("phr_" + k) || "null"); } catch { return null; } },
  set: (k, v) => localStorage.setItem("phr_" + k, JSON.stringify(v)),
  del: (k) => localStorage.removeItem("phr_" + k),
};

const initDB = () => {
  if (DB.get("initialized")) return;

  const users = [
    { id: "u1", phone: "+79001234567", name: "Алексей Петров", role: "hr", dept: "HR", city: "Москва", avatar: "АП", pushEnabled: true, tgLinked: false, emailNotif: true, smsEnabled: true, doNotDisturb: null },
    { id: "u2", phone: "+79001234568", name: "Мария Иванова", role: "employee", dept: "Продажи", city: "Москва", avatar: "МИ", pushEnabled: true, tgLinked: false, emailNotif: true, smsEnabled: true, doNotDisturb: null },
    { id: "u3", phone: "+79001234569", name: "Дмитрий Сидоров", role: "employee", dept: "Разработка", city: "Казань", avatar: "ДС", pushEnabled: false, tgLinked: true, emailNotif: true, smsEnabled: true, doNotDisturb: null },
    { id: "u4", phone: "+79001234570", name: "Екатерина Новикова", role: "employee", dept: "Маркетинг", city: "СПб", avatar: "ЕН", pushEnabled: true, tgLinked: false, emailNotif: false, smsEnabled: true, doNotDisturb: null },
    { id: "u5", phone: "+79001234571", name: "Сергей Козлов", role: "manager", dept: "Продажи", city: "Москва", avatar: "СК", pushEnabled: false, tgLinked: false, emailNotif: true, smsEnabled: false, doNotDisturb: null },
  ];

  const now = Date.now();
  const surveys = [
    {
      id: "s1", title: "eNPS Q1 2025", description: "Оцените готовность рекомендовать компанию как работодателя",
      status: "active", anonymous: true, createdBy: "u1",
      startDate: new Date(now - 7 * 864e5).toISOString().slice(0, 10),
      endDate: new Date(now + 7 * 864e5).toISOString().slice(0, 10),
      targetRoles: ["employee", "manager"],
      questions: [
        { id: "q1", type: "nps", text: "По шкале от 0 до 10, насколько вероятно, что вы порекомендуете нашу компанию как место работы?", required: true, logic: [] },
        { id: "q2", type: "text", text: "Что является главной причиной вашей оценки?", required: false, logic: [] },
        { id: "q3", type: "single", text: "Как давно вы работаете в компании?", required: true, options: ["Менее года", "1–3 года", "3–5 лет", "Более 5 лет"], logic: [] },
      ]
    },
    {
      id: "s2", title: "Условия труда и рабочее место", description: "Оценка удовлетворённости рабочими условиями",
      status: "active", anonymous: false, createdBy: "u1",
      startDate: new Date(now - 3 * 864e5).toISOString().slice(0, 10),
      endDate: new Date(now + 14 * 864e5).toISOString().slice(0, 10),
      targetRoles: ["employee", "manager"],
      questions: [
        { id: "q1", type: "single", text: "Выберите вашу должность", required: true, options: ["Товаровед", "Руководитель", "Офисный сотрудник"], logic: [
          { ifAnswer: "Товаровед", showQuestions: ["q2", "q3"] },
          { ifAnswer: "Руководитель", showQuestions: ["q4", "q5"] },
          { ifAnswer: "Офисный сотрудник", showQuestions: ["q6"] },
        ]},
        { id: "q2", type: "scale", text: "Блок А: Оцените удобство рабочего места", required: true, min: 1, max: 5, logic: [
          { ifBelow: 3, showQuestions: ["q3"] }
        ]},
        { id: "q3", type: "text", text: "Блок А: Что именно неудобно?", required: false, logic: [] },
        { id: "q4", type: "scale", text: "Блок Б: Оцените взаимодействие с командой", required: true, min: 1, max: 5, logic: [] },
        { id: "q5", type: "multiple", text: "Блок Б: Что мешает эффективному управлению?", required: false, options: ["Нехватка времени", "Сложные процессы", "Недостаток ресурсов", "Коммуникация"], logic: [] },
        { id: "q6", type: "scale", text: "Блок В: Оцените комфорт офисной среды", required: true, min: 1, max: 5, logic: [] },
      ]
    },
    {
      id: "s3", title: "Образовательные потребности 2025", description: "Планирование обучения сотрудников",
      status: "draft", anonymous: false, createdBy: "u1",
      startDate: new Date(now + 2 * 864e5).toISOString().slice(0, 10),
      endDate: new Date(now + 30 * 864e5).toISOString().slice(0, 10),
      targetRoles: ["employee", "manager"],
      questions: [
        { id: "q1", type: "multiple", text: "Какие навыки вы хотите развить в следующем году?", required: true, options: ["Лидерство", "Технические навыки", "Коммуникация", "Управление проектами", "Аналитика данных"], logic: [] },
        { id: "q2", type: "single", text: "Предпочтительный формат обучения", required: true, options: ["Онлайн-курсы", "Офлайн-тренинги", "Менторинг", "Конференции"], logic: [] },
      ]
    },
    {
      id: "s4", title: "Pulse: настроение недели", description: "Еженедельный мониторинг вовлечённости",
      status: "completed", anonymous: true, createdBy: "u1",
      startDate: new Date(now - 21 * 864e5).toISOString().slice(0, 10),
      endDate: new Date(now - 14 * 864e5).toISOString().slice(0, 10),
      targetRoles: ["employee", "manager"],
      questions: [
        { id: "q1", type: "scale", text: "Как вы оцениваете свою рабочую неделю?", required: true, min: 1, max: 10, logic: [] },
        { id: "q2", type: "single", text: "Что больше всего повлияло на ваше настроение?", required: false, options: ["Коллеги", "Задачи", "Руководство", "Личные причины", "Другое"], logic: [] },
      ]
    },
  ];

  const responses = [
    { id: "r1", surveyId: "s1", userId: null, sessionId: "sess_abc1", answers: { q1: 9, q2: "Отличная команда и атмосфера", q3: "1–3 года" }, submittedAt: new Date(now - 5 * 864e5).toISOString() },
    { id: "r2", surveyId: "s1", userId: null, sessionId: "sess_abc2", answers: { q1: 7, q2: "", q3: "3–5 лет" }, submittedAt: new Date(now - 4 * 864e5).toISOString() },
    { id: "r3", surveyId: "s1", userId: null, sessionId: "sess_abc3", answers: { q1: 10, q2: "Полная поддержка и развитие", q3: "Менее года" }, submittedAt: new Date(now - 3 * 864e5).toISOString() },
    { id: "r4", surveyId: "s1", userId: null, sessionId: "sess_abc4", answers: { q1: 5, q2: "Много бюрократии", q3: "Более 5 лет" }, submittedAt: new Date(now - 2 * 864e5).toISOString() },
    { id: "r5", surveyId: "s1", userId: null, sessionId: "sess_abc5", answers: { q1: 8, q2: "Хорошие условия", q3: "1–3 года" }, submittedAt: new Date(now - 1 * 864e5).toISOString() },
    { id: "r6", surveyId: "s2", userId: "u3", sessionId: null, answers: { q1: "Офисный сотрудник", q6: 4 }, submittedAt: new Date(now - 2 * 864e5).toISOString() },
    { id: "r7", surveyId: "s4", userId: null, sessionId: "sess_old1", answers: { q1: 7, q2: "Задачи" }, submittedAt: new Date(now - 16 * 864e5).toISOString() },
    { id: "r8", surveyId: "s4", userId: null, sessionId: "sess_old2", answers: { q1: 8, q2: "Коллеги" }, submittedAt: new Date(now - 15 * 864e5).toISOString() },
    { id: "r9", surveyId: "s4", userId: null, sessionId: "sess_old3", answers: { q1: 6, q2: "Руководство" }, submittedAt: new Date(now - 15 * 864e5).toISOString() },
    { id: "r10", surveyId: "s4", userId: null, sessionId: "sess_old4", answers: { q1: 9, q2: "Задачи" }, submittedAt: new Date(now - 14 * 864e5).toISOString() },
  ];

  const notifications = [
    { id: "n1", userId: "u2", surveyId: "s1", channel: "push", status: "delivered", sentAt: new Date(now - 7 * 864e5).toISOString(), openedAt: new Date(now - 7 * 864e5 + 18e5).toISOString(), isRead: true },
    { id: "n2", userId: "u3", surveyId: "s1", channel: "sms", status: "delivered", sentAt: new Date(now - 7 * 864e5).toISOString(), openedAt: null, isRead: false },
    { id: "n3", userId: "u4", surveyId: "s1", channel: "push", status: "delivered", sentAt: new Date(now - 7 * 864e5).toISOString(), openedAt: new Date(now - 7 * 864e5 + 36e5).toISOString(), isRead: true },
    { id: "n4", userId: "u5", surveyId: "s1", channel: "email", status: "delivered", sentAt: new Date(now - 7 * 864e5).toISOString(), openedAt: null, isRead: false },
    { id: "n5", userId: "u2", surveyId: "s2", channel: "push", status: "delivered", sentAt: new Date(now - 3 * 864e5).toISOString(), openedAt: null, isRead: false },
    { id: "n6", userId: "u3", surveyId: "s2", channel: "telegram", status: "delivered", sentAt: new Date(now - 3 * 864e5).toISOString(), openedAt: new Date(now - 3 * 864e5 + 72e5).toISOString(), isRead: true },
  ];

  DB.set("users", users);
  DB.set("surveys", surveys);
  DB.set("responses", responses);
  DB.set("notifications", notifications);
  DB.set("completions", []);
  DB.set("initialized", true);
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10);
const fmtDate = (d) => new Date(d).toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" });
const fmtTime = (d) => new Date(d).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

const calcENPS = (responses, surveyId) => {
  const rs = responses.filter(r => r.surveyId === surveyId);
  const npsAnswers = rs.map(r => r.answers?.q1).filter(v => typeof v === "number");
  if (!npsAnswers.length) return null;
  const promoters = npsAnswers.filter(v => v >= 9).length;
  const detractors = npsAnswers.filter(v => v <= 6).length;
  return Math.round(((promoters - detractors) / npsAnswers.length) * 100);
};

const getDaysLeft = (endDate) => {
  const diff = new Date(endDate) - new Date();
  return Math.max(0, Math.ceil(diff / 864e5));
};

const statusColors = {
  active: { bg: "#ffebee", text: "#000000", label: "Активный" },
  draft: { bg: "#fff8e1", text: "#000000", label: "Черновик" },
  completed: { bg: "#e8f5e9", text: "#000000", label: "Завершён" },
  archive: { bg: "#f5f5f5", text: "#000000", label: "Архив" },
};

const channelLabels = { push: "Push", sms: "SMS", telegram: "Telegram", email: "Email" };

// ─── NOTIFICATION TOAST ─────────────────────────────────────────────────────
const Toast = ({ toasts, setToasts }) => (
  <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10 }}>
    {toasts.map(t => (
      <div key={t.id} style={{
        background: "#ffffff",
        color: "#1e293b", padding: "14px 20px", borderRadius: 12, maxWidth: 340,
        borderLeft: `4px solid ${t.type === "success" ? "#3e463e" : t.type === "error" ? "#c62828" : "#e53935"}`,
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: 14, animation: "slideIn .3s ease",
        display: "flex", gap: 12, alignItems: "flex-start",
      }}>
        <span style={{ fontSize: 18 }}>{t.type === "success" ? "✓" : t.type === "error" ? "✕" : "i"}</span>
        <div>
          {t.title && <div style={{ fontWeight: 700, marginBottom: 2 }}>{t.title}</div>}
          <div style={{ opacity: .7 }}>{t.msg}</div>
        </div>
      </div>
    ))}
  </div>
);

const useToast = () => {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((msg, type = "info", title = "") => {
    const id = uid();
    setToasts(t => [...t, { id, msg, type, title }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);
  return { toasts, setToasts, show };
};

// ─── AUTH SCREEN ─────────────────────────────────────────────────────────────
const AuthScreen = ({ onLogin }) => {
  const [phone, setPhone] = useState("+7");
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [step, setStep] = useState("phone");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef([]);

  const sendOtp = () => {
    const users = DB.get("users") || [];
    const user = users.find(u => u.phone === phone);
    if (!user) { setError("Номер телефона не найден в системе"); return; }
    setError("");
    setLoading(true);
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(code);
    setTimeout(() => {
      setLoading(false);
      setStep("otp");
    }, 1200);
  };

  const verifyOtp = () => {
    const enteredCode = otp.join("");
    if (enteredCode !== generatedOtp) { setError("Неверный код. Попробуйте ещё раз"); return; }
    setError("");
    setLoading(true);
    setTimeout(() => {
      const users = DB.get("users") || [];
      const user = users.find(u => u.phone === phone);
      onLogin(user);
    }, 800);
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#ffffff",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&display=swap');
        @keyframes slideIn { from { transform: translateX(40px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
        * { box-sizing: border-box; }
        input:focus { outline: none; }
      `}</style>

      <div style={{
        background: "#ffffff",
        borderRadius: 24,
        padding: "48px 40px",
        width: "100%",
        maxWidth: 440,
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        border: "1px solid #e0e0e0",
      }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            width: 56, height: 56, background: "#e53935",
            borderRadius: 16, display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, marginBottom: 20, color: "#ffffff",
          }}>HR</div>
          <h1 style={{ color: "#1e293b", fontSize: 28, fontWeight: 700, margin: "0 0 6px", letterSpacing: -0.5 }}>PulseHR</h1>
          <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>Корпоративный сервис опросов</p>
        </div>

        {step === "phone" ? (
          <>
            <div style={{ marginBottom: 8, color: "#334155", fontSize: 13, fontWeight: 500 }}>Номер телефона</div>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+79001234567"
              style={{
                width: "100%", padding: "14px 16px", background: "#fafafa",
                border: "1px solid #e0e0e0", borderRadius: 12, color: "#1e293b",
                fontSize: 15, fontFamily: "inherit", marginBottom: 8,
                transition: "border .2s",
              }}
              onFocus={e => e.target.style.borderColor = "#e53935"}
              onBlur={e => e.target.style.borderColor = "#e0e0e0"}
              onKeyDown={e => e.key === "Enter" && sendOtp()}
            />
            <div style={{ color: "#9e9e9e", fontSize: 12, marginBottom: 24 }}>
              Тестовые номера: +79001234567 (HR), +79001234568 (Сотрудник)
            </div>
            {error && <div style={{ color: "#c62828", fontSize: 13, marginBottom: 16, padding: "10px 14px", background: "#ffebee", borderRadius: 8 }}>{error}</div>}
            <button onClick={sendOtp} disabled={loading} style={{
              width: "100%", padding: "14px", background: "#e53935",
              border: "none", borderRadius: 12, color: "#ffffff", fontSize: 14, fontWeight: 600,
              cursor: "pointer", transition: "background .2s", opacity: loading ? 0.7 : 1,
            }}>
              {loading ? "Отправка..." : "Получить код"}
            </button>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 8, color: "#334155", fontSize: 13, fontWeight: 500 }}>
              Код из SMS на {phone}
            </div>
            <div style={{
              background: "#f5f5f5", border: "1px solid #e0e0e0",
              borderRadius: 10, padding: "10px 16px", marginBottom: 20, fontSize: 13, color: "#616161",
              textAlign: "center",
            }}>
              Демо-код: <strong style={{ letterSpacing: 4, fontSize: 18, color: "#e53935" }}>{generatedOtp}</strong>
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 24, justifyContent: "center" }}>
              {[0, 1, 2, 3].map(i => (
                <input
                  key={i}
                  ref={el => inputRefs.current[i] = el}
                  type="text"
                  maxLength={1}
                  value={otp[i]}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  style={{
                    width: 56, height: 56, textAlign: "center",
                    background: "#fafafa", border: "1px solid #e0e0e0",
                    borderRadius: 12, color: "#1e293b", fontSize: 22, fontWeight: 600,
                    transition: "border .2s",
                  }}
                  onFocus={e => e.target.style.borderColor = "#e53935"}
                  onBlur={e => e.target.style.borderColor = "#e0e0e0"}
                />
              ))}
            </div>
            {error && <div style={{ color: "#c62828", fontSize: 13, marginBottom: 16, padding: "10px 14px", background: "#ffebee", borderRadius: 8 }}>{error}</div>}
            <button onClick={verifyOtp} disabled={otp.some(d => !d) || loading} style={{
              width: "100%", padding: "14px", background: "#e53935",
              border: "none", borderRadius: 12, color: "#ffffff", fontSize: 14, fontWeight: 600,
              cursor: otp.some(d => !d) ? "not-allowed" : "pointer", opacity: otp.some(d => !d) ? 0.5 : 1,
            }}>
              {loading ? "Проверяем..." : "Войти"}
            </button>
            <button onClick={() => { setStep("phone"); setOtp(["", "", "", ""]); setError(""); }} style={{
              width: "100%", marginTop: 12, padding: "10px", background: "transparent",
              border: "none", color: "#9e9e9e", fontSize: 13, cursor: "pointer",
            }}>← Изменить номер</button>
          </>
        )}
      </div>
    </div>
  );
};

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
const Sidebar = ({ user, currentPage, setPage, onLogout, notifCount }) => {
  const isHR = user.role === "hr";
  const navItems = isHR ? [
    { id: "dashboard", icon: "▣", label: "Дашборд" },
    { id: "surveys", icon: "≡", label: "Опросы" },
    { id: "create", icon: "+", label: "Создать опрос" },
    { id: "analytics", icon: "▤", label: "Аналитика" },
    { id: "notifications", icon: "●", label: "Уведомления", badge: notifCount },
    { id: "employees", icon: "◷", label: "Сотрудники" },
    { id: "settings", icon: "⚙", label: "Настройки" },
  ] : [
    { id: "home", icon: "▣", label: "Главная" },
    { id: "my_surveys", icon: "≡", label: "Мои опросы" },
    { id: "notifications", icon: "●", label: "Уведомления", badge: notifCount },
    { id: "profile", icon: "◷", label: "Профиль" },
  ];

  return (
    <div style={{
      width: 240, minHeight: "100vh", background: "#ffffff",
      borderRight: "1px solid #e0e0e0",
      display: "flex", flexDirection: "column",
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <div style={{ padding: "24px 20px 16px", borderBottom: "1px solid #e0e0e0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, background: "#e53935",
            borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#fff",
          }}>HR</div>
          <div>
            <div style={{ color: "#1e293b", fontWeight: 700, fontSize: 16 }}>PulseHR</div>
            <div style={{ color: "#9e9e9e", fontSize: 11 }}>
              {isHR ? "HR-платформа" : user.role === "manager" ? "Руководитель" : "Сотрудник"}
            </div>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: "16px 12px" }}>
        {navItems.map(item => (
          <button key={item.id} onClick={() => setPage(item.id)} style={{
            width: "100%", display: "flex", alignItems: "center", gap: 12,
            padding: "10px 14px", borderRadius: 10, border: "none", cursor: "pointer",
            background: currentPage === item.id ? "#ffebee" : "transparent",
            color: currentPage === item.id ? "#c62828" : "#64748b",
            fontSize: 13, fontWeight: currentPage === item.id ? 500 : 400,
            textAlign: "left", transition: "all .2s", marginBottom: 2,
          }}>
            <span style={{ fontSize: 14, width: 20, textAlign: "center", opacity: 0.7 }}>{item.icon}</span>
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.badge > 0 && (
              <span style={{ background: "#e53935", color: "#fff", fontSize: 11, fontWeight: 600, borderRadius: 20, padding: "2px 7px", minWidth: 20, textAlign: "center" }}>{item.badge}</span>
            )}
          </button>
        ))}
      </nav>

      <div style={{ padding: "16px 16px 24px", borderTop: "1px solid #e0e0e0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "#e53935",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#ffffff", fontSize: 12, fontWeight: 600,
          }}>{user.avatar}</div>
          <div>
            <div style={{ color: "#1e293b", fontSize: 13, fontWeight: 500 }}>{user.name.split(" ")[0]} {user.name.split(" ")[1]?.[0]}.</div>
            <div style={{ color: "#9e9e9e", fontSize: 11 }}>{user.dept}</div>
          </div>
        </div>
        <button onClick={onLogout} style={{
          width: "100%", padding: "8px", background: "#f5f5f5", border: "1px solid #e0e0e0",
          borderRadius: 8, color: "#c62828", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
        }}>Выйти</button>
      </div>
    </div>
  );
};

// ─── STAT CARD ────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, sub }) => (
  <div style={{
    background: "#ffffff", border: "1px solid #e0e0e0",
    borderRadius: 16, padding: 20, flex: 1,
  }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <div style={{ color: "#9e9e9e", fontSize: 12, marginBottom: 8 }}>{label}</div>
        <div style={{ color: "#1e293b", fontSize: 28, fontWeight: 700, letterSpacing: -0.5 }}>{value}</div>
        {sub && <div style={{ color: "#bdbdbd", fontSize: 11, marginTop: 4 }}>{sub}</div>}
      </div>
      <div style={{
        width: 44, height: 44, background: "#ffebee",
        borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
        color: "#e53935",
      }}>{icon}</div>
    </div>
  </div>
);

// ─── MINI BAR CHART ──────────────────────────────────────────────────────────
const MiniBar = ({ data, color = "#e53935" }) => {
  const max = Math.max(...data.map(d => d.v), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 60 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{
            width: "100%", background: "#e0e0e0", borderRadius: 4,
            height: `${(d.v / max) * 52}px`, position: "relative", overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              background: color, borderRadius: 4, height: "100%", opacity: 0.8,
            }} />
          </div>
          <div style={{ color: "#bdbdbd", fontSize: 9, whiteSpace: "nowrap" }}>{d.l}</div>
        </div>
      ))}
    </div>
  );
};

// ─── ENPS GAUGE ──────────────────────────────────────────────────────────────
const ENPSGauge = ({ value }) => {
  if (value === null) return <div style={{ color: "#bdbdbd" }}>Нет данных</div>;
  const color = value >= 30 ? "#2e7d32" : value >= 0 ? "#f57c00" : "#c62828";
  const label = value >= 50 ? "Отлично" : value >= 30 ? "Хорошо" : value >= 0 ? "Нейтрально" : "Критично";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div style={{
        width: 100, height: 100, borderRadius: "50%",
        background: `conic-gradient(${color} ${(value + 100) / 2}%, #e0e0e0 0)`,
        display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
      }}>
        <div style={{
          width: 70, height: 70, borderRadius: "50%", background: "#ffffff",
          display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        }}>
          <div style={{ color, fontSize: 20, fontWeight: 700 }}>{value > 0 ? "+" : ""}{value}</div>
        </div>
      </div>
      <div style={{ color, fontSize: 12, fontWeight: 500 }}>{label}</div>
    </div>
  );
};

// ─── SURVEY CARD ─────────────────────────────────────────────────────────────
const SurveyCard = ({ survey, responses, onStart, onEdit, onView, isHR, completions, userId }) => {
  const s = statusColors[survey.status];
  const total = responses.filter(r => r.surveyId === survey.id).length;
  const days = getDaysLeft(survey.endDate);
  const completed = completions?.some(c => c.surveyId === survey.id && c.userId === userId);

  return (
    <div style={{
      background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 16, padding: 24, transition: "box-shadow .2s",
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={{ background: s.bg, color: s.text, padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500 }}>{s.label}</span>
          <span style={{ background: survey.anonymous ? "#ffebee" : "#e3f2fd", color: survey.anonymous ? "#c62828" : "#1565c0", padding: "4px 10px", borderRadius: 20, fontSize: 11 }}>
            {survey.anonymous ? "Анонимный" : "Идентифицированный"}
          </span>
        </div>
        {isHR && (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => onView(survey)} style={{ background: "#f5f5f5", border: "1px solid #e0e0e0", color: "#616161", padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12 }}>Результаты</button>
            {survey.status === "draft" && <button onClick={() => onEdit(survey)} style={{ background: "#e53935", border: "none", color: "#ffffff", padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12 }}>Редактировать</button>}
          </div>
        )}
      </div>
      <h3 style={{ color: "#1e293b", fontSize: 17, fontWeight: 600, margin: "0 0 8px" }}>{survey.title}</h3>
      <p style={{ color: "#9e9e9e", fontSize: 13, margin: "0 0 16px", lineHeight: 1.5 }}>{survey.description}</p>
      <div style={{ display: "flex", gap: 20, fontSize: 12, color: "#bdbdbd", marginBottom: 16 }}>
        <span>Вопросов: {survey.questions.length}</span>
        <span>до {fmtDate(survey.endDate)}</span>
        {survey.status === "active" && <span style={{ color: days <= 3 ? "#f57c00" : "#bdbdbd" }}>осталось {days} д.</span>}
        {isHR && <span>ответов: {total}</span>}
      </div>
      {!isHR && survey.status === "active" && (
        completed ? (
          <div style={{ padding: "10px 16px", background: "#e8f5e9", border: "1px solid #c8e6c9", borderRadius: 10, color: "#2e7d32", fontSize: 12, fontWeight: 500 }}>
            Пройден
          </div>
        ) : (
          <button onClick={() => onStart(survey)} style={{
            padding: "10px 20px", background: "#e53935",
            border: "none", borderRadius: 10, color: "#ffffff", fontSize: 13, fontWeight: 500,
            cursor: "pointer", transition: "background .2s",
          }}>Пройти опрос</button>
        )
      )}
    </div>
  );
};

// ─── SURVEY TAKING ────────────────────────────────────────────────────────────
const TakeSurvey = ({ survey, user, onSubmit, onBack }) => {
  const [answers, setAnswers] = useState({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const getVisibleQuestions = () => {
    let visible = [survey.questions[0]];
    const q0 = survey.questions[0];
    if (q0 && q0.logic && answers[q0.id]) {
      const matchLogic = q0.logic.find(l => l.ifAnswer === answers[q0.id]);
      if (matchLogic) {
        visible = survey.questions.filter(q => q.id === q0.id || matchLogic.showQuestions.includes(q.id));
      } else {
        visible = survey.questions;
      }
    } else {
      visible = survey.questions;
    }
    return visible.filter(q => {
      if (q.type === "scale" && q.logic && q.logic.length > 0) return true;
      const parentQ = survey.questions.find(pq => pq.logic?.some(l => l.showQuestions?.includes(q.id)));
      if (parentQ && parentQ.type === "scale") {
        const parentAns = answers[parentQ.id];
        if (parentAns !== undefined) {
          const below = parentQ.logic.find(l => l.ifBelow);
          if (below && parentAns < below.ifBelow) {
            return below.showQuestions.includes(q.id) || !parentQ.logic.some(l => l.showQuestions?.includes(q.id));
          }
          return !parentQ.logic.some(l => l.showQuestions?.includes(q.id));
        }
        return false;
      }
      return true;
    });
  };

  const visibleQs = getVisibleQuestions();
  const current = visibleQs[currentIdx];
  const progress = ((currentIdx + 1) / visibleQs.length) * 100;

  const handleNext = () => {
    if (currentIdx < visibleQs.length - 1) setCurrentIdx(i => i + 1);
    else submitSurvey();
  };

  const submitSurvey = () => {
    const responses = DB.get("responses") || [];
    const newResp = {
      id: "r" + uid(), surveyId: survey.id,
      userId: survey.anonymous ? null : user.id,
      sessionId: survey.anonymous ? "sess_" + uid() : null,
      answers, submittedAt: new Date().toISOString(),
    };
    DB.set("responses", [...responses, newResp]);
    const completions = DB.get("completions") || [];
    DB.set("completions", [...completions, { userId: user.id, surveyId: survey.id }]);
    setSubmitted(true);
  };

  if (submitted) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: 20 }}>
      <div style={{ fontSize: 48, opacity: 0.7, color: "#2e7d32" }}>✓</div>
      <h2 style={{ color: "#1e293b", fontSize: 24, fontWeight: 600, margin: 0 }}>Ответы отправлены</h2>
      <p style={{ color: "#9e9e9e", textAlign: "center", maxWidth: 360, fontSize: 14 }}>
        Спасибо за участие в опросе "{survey.title}".
        {survey.anonymous && " Ваши ответы полностью анонимны."}
      </p>
      <button onClick={onBack} style={{
        padding: "10px 24px", background: "#e53935",
        border: "none", borderRadius: 10, color: "#ffffff", fontSize: 14, fontWeight: 500, cursor: "pointer",
      }}>← Назад к опросам</button>
    </div>
  );

  const setAnswer = (qid, val) => setAnswers(a => ({ ...a, [qid]: val }));
  const ans = answers[current?.id];
  const canProceed = !current?.required || (ans !== undefined && ans !== "" && (Array.isArray(ans) ? ans.length > 0 : true));

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      <div style={{
        padding: "12px 16px", marginBottom: 24, borderRadius: 12,
        background: survey.anonymous ? "#ffebee" : "#e3f2fd",
        border: `1px solid ${survey.anonymous ? "#ef9a9a" : "#90caf9"}`,
        color: survey.anonymous ? "#c62828" : "#1565c0", fontSize: 12,
      }}>
        {survey.anonymous
          ? "Этот опрос анонимный. HR не увидит ваши ответы."
          : "Ваши ответы будут видны HR с указанием вашего имени."}
      </div>

      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", color: "#bdbdbd", fontSize: 12, marginBottom: 8 }}>
          <span>Вопрос {currentIdx + 1} из {visibleQs.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div style={{ height: 4, background: "#e0e0e0", borderRadius: 2 }}>
          <div style={{ height: "100%", width: `${progress}%`, background: "#e53935", borderRadius: 2, transition: "width .4s" }} />
        </div>
      </div>

      {current && (
        <div style={{ background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 20, padding: 28 }}>
          <div style={{ color: "#9e9e9e", fontSize: 12, marginBottom: 10 }}>
            {current.required && <span style={{ color: "#c62828" }}>* </span>}Вопрос {currentIdx + 1}
          </div>
          <h3 style={{ color: "#1e293b", fontSize: 18, fontWeight: 600, margin: "0 0 24px", lineHeight: 1.4 }}>{current.text}</h3>

          {current.type === "single" && current.options?.map(opt => (
            <button key={opt} onClick={() => setAnswer(current.id, opt)} style={{
              display: "block", width: "100%", textAlign: "left",
              padding: "12px 16px", marginBottom: 8, borderRadius: 10,
              background: ans === opt ? "#ffebee" : "#fafafa",
              border: `1px solid ${ans === opt ? "#e53935" : "#e0e0e0"}`,
              color: ans === opt ? "#c62828" : "#616161", cursor: "pointer", fontSize: 14, fontFamily: "inherit",
            }}>{opt}</button>
          ))}

          {current.type === "multiple" && current.options?.map(opt => {
            const selected = Array.isArray(ans) && ans.includes(opt);
            return (
              <button key={opt} onClick={() => {
                const cur = Array.isArray(ans) ? ans : [];
                setAnswer(current.id, selected ? cur.filter(x => x !== opt) : [...cur, opt]);
              }} style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "12px 16px", marginBottom: 8, borderRadius: 10,
                background: selected ? "#ffebee" : "#fafafa",
                border: `1px solid ${selected ? "#e53935" : "#e0e0e0"}`,
                color: selected ? "#c62828" : "#616161", cursor: "pointer", fontSize: 14, fontFamily: "inherit",
              }}>
                <span style={{ marginRight: 10 }}>{selected ? "✓" : "□"}</span>{opt}
              </button>
            );
          })}

          {(current.type === "scale" || current.type === "nps") && (() => {
            const min = current.min || 0;
            const max = current.max || 10;
            const vals = Array.from({ length: max - min + 1 }, (_, i) => i + min);
            return (
              <div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                  {vals.map(v => (
                    <button key={v} onClick={() => setAnswer(current.id, v)} style={{
                      width: 48, height: 48, borderRadius: 10,
                      background: ans === v ? "#e53935" : "#fafafa",
                      border: `1px solid ${ans === v ? "#e53935" : "#e0e0e0"}`,
                      color: ans === v ? "#ffffff" : "#616161", cursor: "pointer", fontSize: 15, fontWeight: 500, fontFamily: "inherit",
                    }}>{v}</button>
                  ))}
                </div>
                {current.type === "nps" && (
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#bdbdbd", fontSize: 11 }}>
                    <span>0 — Точно нет</span><span>10 — Однозначно да</span>
                  </div>
                )}
              </div>
            );
          })()}

          {current.type === "text" && (
            <textarea
              value={ans || ""}
              onChange={e => setAnswer(current.id, e.target.value)}
              placeholder="Введите ваш ответ..."
              rows={4}
              style={{
                width: "100%", padding: "12px 14px",
                background: "#fafafa", border: "1px solid #e0e0e0",
                borderRadius: 10, color: "#1e293b", fontSize: 14, fontFamily: "inherit", resize: "vertical",
              }}
            />
          )}

          {current.type === "matrix" && (
            <div style={{ color: "#bdbdbd", fontSize: 14 }}>Матричный вопрос (в разработке)</div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28 }}>
            {currentIdx > 0 ? (
              <button onClick={() => setCurrentIdx(i => i - 1)} style={{
                padding: "10px 20px", background: "#fafafa", border: "1px solid #e0e0e0",
                borderRadius: 10, color: "#616161", cursor: "pointer", fontSize: 13, fontFamily: "inherit",
              }}>← Назад</button>
            ) : <div />}
            <button onClick={handleNext} disabled={!canProceed} style={{
              padding: "10px 24px", background: canProceed ? "#e53935" : "#e0e0e0",
              border: "none", borderRadius: 10, color: canProceed ? "#ffffff" : "#9e9e9e",
              cursor: canProceed ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 500, fontFamily: "inherit",
            }}>
              {currentIdx < visibleQs.length - 1 ? "Далее" : "Отправить"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── SURVEY BUILDER ───────────────────────────────────────────────────────────
const SurveyBuilder = ({ survey: editSurvey, user, onSave, onBack, toast }) => {
  const [form, setForm] = useState(editSurvey || {
    title: "", description: "", anonymous: true,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10),
    targetRoles: ["employee", "manager"], status: "draft",
    questions: [],
  });

  const addQuestion = (type) => {
    const q = {
      id: "q" + uid(), type, text: "", required: true, logic: [],
      ...(["single", "multiple"].includes(type) ? { options: ["Вариант 1", "Вариант 2"] } : {}),
      ...(type === "scale" ? { min: 1, max: 5 } : {}),
      ...(type === "nps" ? { min: 0, max: 10 } : {}),
    };
    setForm(f => ({ ...f, questions: [...f.questions, q] }));
  };

  const updateQ = (qid, upd) => setForm(f => ({ ...f, questions: f.questions.map(q => q.id === qid ? { ...q, ...upd } : q) }));
  const removeQ = (qid) => setForm(f => ({ ...f, questions: f.questions.filter(q => q.id !== qid) }));
  const moveQ = (idx, dir) => {
    const qs = [...form.questions];
    const tmp = qs[idx]; qs[idx] = qs[idx + dir]; qs[idx + dir] = tmp;
    setForm(f => ({ ...f, questions: qs }));
  };

  const save = (status) => {
    if (!form.title) { toast("Введите название опроса", "error"); return; }
    if (!form.questions.length) { toast("Добавьте хотя бы один вопрос", "error"); return; }
    const surveys = DB.get("surveys") || [];
    const newSurvey = { ...form, status, id: form.id || "s" + uid(), createdBy: user.id };
    const existing = surveys.find(s => s.id === newSurvey.id);
    const updated = existing ? surveys.map(s => s.id === newSurvey.id ? newSurvey : s) : [...surveys, newSurvey];
    DB.set("surveys", updated);

    if (status === "active") {
      const users = DB.get("users") || [];
      const notifs = DB.get("notifications") || [];
      const targets = users.filter(u => form.targetRoles.includes(u.role) && u.id !== user.id);
      const newNotifs = targets.map(u => ({
        id: "n" + uid(), userId: u.id, surveyId: newSurvey.id,
        channel: u.pushEnabled ? "push" : u.tgLinked ? "telegram" : "sms",
        status: "delivered", sentAt: new Date().toISOString(), openedAt: null,
        isRead: false,
      }));
      DB.set("notifications", [...notifs, ...newNotifs]);
      toast(`Опрос опубликован. ${newNotifs.length} уведомлений отправлено`, "success", "Опрос запущен");
    } else {
      toast("Черновик сохранён", "success");
    }
    onSave();
  };

  const qTypes = [
    { type: "single", label: "Одиночный выбор", icon: "◉" },
    { type: "multiple", label: "Множественный выбор", icon: "☑" },
    { type: "scale", label: "Шкала оценки", icon: "★" },
    { type: "nps", label: "NPS / eNPS", icon: "N" },
    { type: "text", label: "Текстовый ответ", icon: "✏" },
    { type: "matrix", label: "Матричный вопрос", icon: "⊞" },
  ];

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
        <button onClick={onBack} style={{ background: "#fafafa", border: "1px solid #e0e0e0", color: "#616161", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>← Назад</button>
        <h2 style={{ color: "#1e293b", fontSize: 22, fontWeight: 600, margin: 0 }}>
          {editSurvey ? "Редактировать опрос" : "Создать опрос"}
        </h2>
      </div>

      <div style={{ background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 16, padding: 24, marginBottom: 20 }}>
        <h3 style={{ color: "#1e293b", fontSize: 13, fontWeight: 600, margin: "0 0 20px", letterSpacing: 0.5 }}>Основные настройки</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ gridColumn: "1/-1" }}>
            <label style={{ color: "#616161", fontSize: 12, display: "block", marginBottom: 6 }}>Название опроса *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Например: eNPS Q2 2025"
              style={{ width: "100%", padding: "12px 14px", background: "#fafafa", border: "1px solid #e0e0e0", borderRadius: 10, color: "#1e293b", fontSize: 14, fontFamily: "inherit" }} />
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <label style={{ color: "#616161", fontSize: 12, display: "block", marginBottom: 6 }}>Описание</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Краткое описание цели опроса" rows={2}
              style={{ width: "100%", padding: "12px 14px", background: "#fafafa", border: "1px solid #e0e0e0", borderRadius: 10, color: "#1e293b", fontSize: 14, fontFamily: "inherit", resize: "none" }} />
          </div>
          <div>
            <label style={{ color: "#616161", fontSize: 12, display: "block", marginBottom: 6 }}>Дата начала</label>
            <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
              style={{ width: "100%", padding: "12px 14px", background: "#fafafa", border: "1px solid #e0e0e0", borderRadius: 10, color: "#1e293b", fontSize: 14, fontFamily: "inherit" }} />
          </div>
          <div>
            <label style={{ color: "#616161", fontSize: 12, display: "block", marginBottom: 6 }}>Дата окончания</label>
            <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
              style={{ width: "100%", padding: "12px 14px", background: "#fafafa", border: "1px solid #e0e0e0", borderRadius: 10, color: "#1e293b", fontSize: 14, fontFamily: "inherit" }} />
          </div>
          <div>
            <label style={{ color: "#616161", fontSize: 12, display: "block", marginBottom: 6 }}>Целевая аудитория</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["employee", "manager", "hr"].map(r => {
                const labels = { employee: "Сотрудники", manager: "Руководители", hr: "HR" };
                const sel = form.targetRoles.includes(r);
                return (
                  <button key={r} onClick={() => setForm(f => ({
                    ...f, targetRoles: sel ? f.targetRoles.filter(x => x !== r) : [...f.targetRoles, r]
                  }))} style={{
                    padding: "5px 12px", borderRadius: 20,
                    background: sel ? "#e53935" : "#fafafa",
                    border: `1px solid ${sel ? "#e53935" : "#e0e0e0"}`,
                    color: sel ? "#ffffff" : "#616161", cursor: "pointer", fontSize: 12, fontFamily: "inherit",
                  }}>{labels[r]}</button>
                );
              })}
            </div>
          </div>
          <div>
            <label style={{ color: "#616161", fontSize: 12, display: "block", marginBottom: 6 }}>Режим конфиденциальности</label>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setForm(f => ({ ...f, anonymous: true }))} style={{
                flex: 1, padding: "8px", borderRadius: 10,
                background: form.anonymous ? "#ffebee" : "#fafafa",
                border: `1px solid ${form.anonymous ? "#e53935" : "#e0e0e0"}`,
                color: form.anonymous ? "#c62828" : "#616161", cursor: "pointer", fontSize: 12, fontFamily: "inherit",
              }}>Анонимный</button>
              <button onClick={() => setForm(f => ({ ...f, anonymous: false }))} style={{
                flex: 1, padding: "8px", borderRadius: 10,
                background: !form.anonymous ? "#e3f2fd" : "#fafafa",
                border: `1px solid ${!form.anonymous ? "#1565c0" : "#e0e0e0"}`,
                color: !form.anonymous ? "#1565c0" : "#616161", cursor: "pointer", fontSize: 12, fontFamily: "inherit",
              }}>Идентифицированный</button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 16, padding: 24, marginBottom: 20 }}>
        <h3 style={{ color: "#1e293b", fontSize: 13, fontWeight: 600, margin: "0 0 20px", letterSpacing: 0.5 }}>Вопросы</h3>

        {form.questions.map((q, idx) => (
          <div key={q.id} style={{
            background: "#fafafa", border: "1px solid #e0e0e0",
            borderRadius: 12, padding: 16, marginBottom: 12,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ color: "#1e293b", fontWeight: 600, fontSize: 13 }}>#{idx + 1}</span>
                <span style={{ background: "#e0e0e0", color: "#1e293b", padding: "2px 8px", borderRadius: 20, fontSize: 11 }}>
                  {qTypes.find(t => t.type === q.type)?.label}
                </span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {idx > 0 && <button onClick={() => moveQ(idx, -1)} style={{ background: "transparent", border: "1px solid #e0e0e0", color: "#616161", padding: "4px 8px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>↑</button>}
                {idx < form.questions.length - 1 && <button onClick={() => moveQ(idx, 1)} style={{ background: "transparent", border: "1px solid #e0e0e0", color: "#616161", padding: "4px 8px", borderRadius: 6, cursor: "pointer", fontSize: 12 }}>↓</button>}
                <button onClick={() => removeQ(q.id)} style={{ background: "#ffebee", border: "1px solid #ffcdd2", color: "#c62828", padding: "4px 8px", borderRadius: 6, cursor: "pointer", fontSize: 11 }}>✕</button>
              </div>
            </div>
            <input
              value={q.text}
              onChange={e => updateQ(q.id, { text: e.target.value })}
              placeholder="Текст вопроса..."
              style={{ width: "100%", padding: "10px 12px", background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 8, color: "#1e293b", fontSize: 13, fontFamily: "inherit", marginBottom: 10 }}
            />
            {["single", "multiple"].includes(q.type) && (
              <div>
                {q.options?.map((opt, oi) => (
                  <div key={oi} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                    <input value={opt} onChange={e => {
                      const opts = [...q.options]; opts[oi] = e.target.value;
                      updateQ(q.id, { options: opts });
                    }} style={{ flex: 1, padding: "6px 10px", background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 6, color: "#1e293b", fontSize: 12, fontFamily: "inherit" }} />
                    <button onClick={() => updateQ(q.id, { options: q.options.filter((_, i) => i !== oi) })} style={{ background: "transparent", border: "none", color: "#9e9e9e", cursor: "pointer", fontSize: 14 }}>✕</button>
                  </div>
                ))}
                <button onClick={() => updateQ(q.id, { options: [...q.options, "Вариант " + (q.options.length + 1)] })} style={{
                  padding: "5px 12px", background: "transparent", border: "1px dashed #bdbdbd", borderRadius: 6, color: "#616161", cursor: "pointer", fontSize: 12, fontFamily: "inherit",
                }}>+ Добавить вариант</button>
              </div>
            )}
            {(q.type === "scale" || q.type === "nps") && (
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ color: "#9e9e9e", fontSize: 11, display: "block", marginBottom: 4 }}>Мин.</label>
                  <input type="number" value={q.min} onChange={e => updateQ(q.id, { min: +e.target.value })}
                    style={{ width: "100%", padding: "6px 10px", background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 6, color: "#1e293b", fontSize: 13, fontFamily: "inherit" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ color: "#9e9e9e", fontSize: 11, display: "block", marginBottom: 4 }}>Макс.</label>
                  <input type="number" value={q.max} onChange={e => updateQ(q.id, { max: +e.target.value })}
                    style={{ width: "100%", padding: "6px 10px", background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 6, color: "#1e293b", fontSize: 13, fontFamily: "inherit" }} />
                </div>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
              <input type="checkbox" checked={q.required} onChange={e => updateQ(q.id, { required: e.target.checked })} id={`req_${q.id}`} />
              <label htmlFor={`req_${q.id}`} style={{ color: "#9e9e9e", fontSize: 12, cursor: "pointer" }}>Обязательный</label>
            </div>
          </div>
        ))}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          {qTypes.map(t => (
            <button key={t.type} onClick={() => addQuestion(t.type)} style={{
              padding: "6px 14px", background: "#fafafa", border: "1px dashed #bdbdbd",
              borderRadius: 8, color: "#616161", cursor: "pointer", fontSize: 12, fontFamily: "inherit",
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
        <button onClick={() => save("draft")} style={{
          padding: "10px 20px", background: "#fafafa", border: "1px solid #e0e0e0",
          borderRadius: 10, color: "#616161", cursor: "pointer", fontSize: 13, fontFamily: "inherit",
        }}>Сохранить черновик</button>
        <button onClick={() => save("active")} style={{
          padding: "10px 20px", background: "#e53935",
          border: "none", borderRadius: 10, color: "#ffffff", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
        }}>Опубликовать</button>
      </div>
    </div>
  );
};

// ─── SURVEY RESULTS ───────────────────────────────────────────────────────────
const SurveyResults = ({ survey, responses: allResponses, users, onBack }) => {
  const rs = allResponses.filter(r => r.surveyId === survey.id);
  const enps = survey.questions.some(q => q.type === "nps") ? calcENPS(allResponses, survey.id) : null;
  const [tab, setTab] = useState("overview");

  const getQuestionStats = (q) => {
    const answers = rs.map(r => r.answers[q.id]).filter(a => a !== undefined && a !== "");
    if (!answers.length) return null;
    if (q.type === "single" || q.type === "multiple") {
      const counts = {};
      answers.forEach(a => {
        const opts = Array.isArray(a) ? a : [a];
        opts.forEach(o => { counts[o] = (counts[o] || 0) + 1; });
      });
      return { type: "choices", counts, total: answers.length };
    }
    if (q.type === "scale" || q.type === "nps") {
      const avg = answers.reduce((s, v) => s + v, 0) / answers.length;
      const dist = {};
      answers.forEach(v => { dist[v] = (dist[v] || 0) + 1; });
      return { type: "numeric", avg: avg.toFixed(1), dist, total: answers.length };
    }
    if (q.type === "text") {
      return { type: "text", answers: answers.filter(a => a.trim()), total: answers.length };
    }
    return null;
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <button onClick={onBack} style={{ background: "#fafafa", border: "1px solid #e0e0e0", color: "#616161", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>← Назад</button>
        <div>
          <h2 style={{ color: "#1e293b", fontSize: 20, fontWeight: 600, margin: 0 }}>{survey.title}</h2>
          <div style={{ color: "#9e9e9e", fontSize: 12, marginTop: 4 }}>
            {rs.length} ответов · {survey.anonymous ? "Анонимный" : "Идентифицированный"}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "#f5f5f5", borderRadius: 12, padding: 4 }}>
        {["overview", "responses", "notifications"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: "10px", borderRadius: 9, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 500,
            background: tab === t ? "#ffffff" : "transparent",
            color: tab === t ? "#1e293b" : "#9e9e9e",
            boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
          }}>
            {{ overview: "Обзор", responses: "Ответы", notifications: "Уведомления" }[t]}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div>
          <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
            <StatCard icon="" label="Всего ответов" value={rs.length} sub={`из ${users.filter(u => survey.targetRoles.includes(u.role)).length} сотрудников`} />
            <StatCard icon="" label="Срок окончания" value={fmtDate(survey.endDate)} sub={getDaysLeft(survey.endDate) + " дней осталось"} />
            {enps !== null && (
              <div style={{ background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 16, padding: 20, flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <div style={{ color: "#9e9e9e", fontSize: 12, marginBottom: 4 }}>eNPS</div>
                <ENPSGauge value={enps} />
              </div>
            )}
          </div>

          {survey.questions.map(q => {
            const stats = getQuestionStats(q);
            if (!stats) return null;
            return (
              <div key={q.id} style={{ background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 16, padding: 24, marginBottom: 16 }}>
                <div style={{ color: "#9e9e9e", fontSize: 12, marginBottom: 4 }}>
                  <span style={{ background: "#f5f5f5", color: "#1e293b", padding: "2px 8px", borderRadius: 20, fontSize: 10, marginRight: 8 }}>
                    {qTypes2[q.type] || q.type}
                  </span>
                  {stats.total} ответов
                </div>
                <h4 style={{ color: "#1e293b", fontSize: 15, fontWeight: 600, margin: "6px 0 18px" }}>{q.text}</h4>

                {stats.type === "choices" && (
                  <div>
                    {Object.entries(stats.counts).sort((a, b) => b[1] - a[1]).map(([opt, count]) => {
                      const pct = Math.round((count / stats.total) * 100);
                      return (
                        <div key={opt} style={{ marginBottom: 10 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", color: "#616161", fontSize: 12, marginBottom: 5 }}>
                            <span>{opt}</span><span style={{ fontWeight: 600, color: "#e53935" }}>{count} ({pct}%)</span>
                          </div>
                          <div style={{ height: 6, background: "#e0e0e0", borderRadius: 3 }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: "#e53935", borderRadius: 3, transition: "width .6s" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {stats.type === "numeric" && (
                  <div>
                    <div style={{ fontSize: 32, fontWeight: 600, color: "#1e293b", marginBottom: 16 }}>
                      {stats.avg} <span style={{ fontSize: 13, color: "#9e9e9e", fontWeight: 400 }}>/ {q.max || 10} ср. оценка</span>
                    </div>
                    <MiniBar data={Object.entries(stats.dist).sort((a,b)=>+a[0]-+b[0]).map(([v,c])=>({l:v,v:c}))} />
                  </div>
                )}

                {stats.type === "text" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {stats.answers.map((a, i) => (
                      <div key={i} style={{ background: "#fafafa", borderLeft: "3px solid #e53935", padding: "8px 14px", borderRadius: "0 8px 8px 0", color: "#1e293b", fontSize: 13 }}>
                        {a}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === "responses" && (
        <div>
          {rs.length === 0 ? (
            <div style={{ textAlign: "center", color: "#bdbdbd", padding: "60px 0" }}>Ответов пока нет</div>
          ) : rs.map((r, i) => {
            const respondent = !survey.anonymous && r.userId ? users.find(u => u.id === r.userId) : null;
            return (
              <div key={r.id} style={{ background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 14, padding: 20, marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {respondent ? (
                      <>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#e53935", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff", fontSize: 12, fontWeight: 600 }}>{respondent.avatar}</div>
                        <div>
                          <div style={{ color: "#1e293b", fontSize: 13, fontWeight: 500 }}>{respondent.name}</div>
                          <div style={{ color: "#9e9e9e", fontSize: 11 }}>{respondent.dept}</div>
                        </div>
                      </>
                    ) : (
                      <div style={{ color: "#9e9e9e", fontSize: 13 }}>Анонимный ответ #{i + 1}</div>
                    )}
                  </div>
                  <div style={{ color: "#bdbdbd", fontSize: 11 }}>{fmtDate(r.submittedAt)} {fmtTime(r.submittedAt)}</div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {survey.questions.map(q => {
                    const a = r.answers[q.id];
                    if (a === undefined || a === "") return null;
                    return (
                      <div key={q.id} style={{ background: "#f5f5f5", border: "1px solid #e0e0e0", borderRadius: 8, padding: "4px 10px" }}>
                        <div style={{ color: "#9e9e9e", fontSize: 10, marginBottom: 2 }}>{q.text.slice(0, 40)}{q.text.length > 40 ? "..." : ""}</div>
                        <div style={{ color: "#1e293b", fontSize: 12, fontWeight: 500 }}>
                          {Array.isArray(a) ? a.join(", ") : String(a)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "notifications" && (
        <NotificationsTab surveyId={survey.id} users={users} />
      )}
    </div>
  );
};

const qTypes2 = { single: "Одиночный", multiple: "Множественный", scale: "Шкала", nps: "NPS", text: "Текст", matrix: "Матрица" };

// ─── NOTIFICATIONS TAB ────────────────────────────────────────────────────────
const NotificationsTab = ({ surveyId, users }) => {
  const notifs = (DB.get("notifications") || []).filter(n => !surveyId || n.surveyId === surveyId);
  const byChannel = notifs.reduce((acc, n) => { acc[n.channel] = (acc[n.channel] || 0) + 1; return acc; }, {});
  const opened = notifs.filter(n => n.openedAt).length;
  const ctr = notifs.length ? Math.round((opened / notifs.length) * 100) : 0;

  return (
    <div>
      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        <StatCard icon="✔" label="Всего отправлено" value={notifs.length} />
        <StatCard icon="✔" label="Открыто" value={opened} sub={`CTR: ${ctr}%`} />
        <StatCard icon="✔" label="SMS отправлено" value={byChannel.sms || 0} sub="резервный канал" />
      </div>

      <div style={{ background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 16, padding: 24, marginBottom: 20 }}>
        <h3 style={{ color: "#1e293b", fontSize: 13, fontWeight: 600, margin: "0 0 18px", letterSpacing: 0.5 }}>Эффективность каналов</h3>
        {Object.entries(channelLabels).map(([ch, label]) => {
          const sent = byChannel[ch] || 0;
          const openedCh = notifs.filter(n => n.channel === ch && n.openedAt).length;
          const pct = sent ? Math.round((openedCh / sent) * 100) : 0;
          return (
            <div key={ch} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ color: "#616161", fontSize: 13 }}>{label}</span>
                <span style={{ color: "#9e9e9e", fontSize: 12 }}>{openedCh}/{sent} · {pct}% CTR</span>
              </div>
              <div style={{ height: 6, background: "#e0e0e0", borderRadius: 3 }}>
                <div style={{ height: "100%", width: `${pct}%`, background: "#e53935", borderRadius: 3 }} />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 16, padding: 24 }}>
        <h3 style={{ color: "#1e293b", fontSize: 13, fontWeight: 600, margin: "0 0 18px", letterSpacing: 0.5 }}>Журнал уведомлений</h3>
        {notifs.slice(0, 20).map(n => {
          const u = users.find(x => x.id === n.userId);
          return (
            <div key={n.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: "1px solid #e0e0e0" }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#1e293b", fontSize: 13, fontWeight: 500 }}>{u?.name || "—"}</div>
                <div style={{ color: "#bdbdbd", fontSize: 11 }}>{channelLabels[n.channel]} · {fmtDate(n.sentAt)} {fmtTime(n.sentAt)}</div>
              </div>
              <span style={{
                padding: "2px 8px", borderRadius: 20, fontSize: 11,
                background: n.openedAt ? "#e8f5e9" : "#f5f5f5",
                color: n.openedAt ? "#2e7d32" : "#9e9e9e",
              }}>{n.openedAt ? "Открыто" : "Доставлено"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── HR DASHBOARD ─────────────────────────────────────────────────────────────
const HRDashboard = ({ surveys, responses, users, notifications, setPage, onViewSurvey }) => {
  const activeSurveys = surveys.filter(s => s.status === "active");
  const totalResponses = responses.length;
  const enps = calcENPS(responses, "s1");
  const avgResponseRate = activeSurveys.length
    ? Math.round(activeSurveys.reduce((s, survey) => {
        const r = responses.filter(x => x.surveyId === survey.id).length;
        const total = users.filter(u => survey.targetRoles.includes(u.role)).length;
        return s + (total ? r / total : 0);
      }, 0) / activeSurveys.length * 100)
    : 0;

  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 864e5);
    const dayStr = d.toISOString().slice(0, 10);
    const count = responses.filter(r => r.submittedAt?.slice(0, 10) === dayStr).length;
    return { l: ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"][(d.getDay() + 6) % 7], v: count };
  });

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ color: "#1e293b", fontSize: 24, fontWeight: 600, margin: "0 0 6px" }}>Дашборд</h2>
        <p style={{ color: "#9e9e9e", margin: 0, fontSize: 13 }}>Обзор активности</p>
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <StatCard icon="≡" label="Активных опросов" value={activeSurveys.length} sub={surveys.length + " всего"} />
        <StatCard icon="✓" label="Всего ответов" value={totalResponses} sub="за всё время" />
        <StatCard icon="▤" label="Охват (в среднем)" value={avgResponseRate + "%"} sub="активных опросов" />
        <StatCard icon="●" label="Уведомлений" value={notifications.length} sub={notifications.filter(n => n.openedAt).length + " открыто"} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginBottom: 24 }}>
        <div style={{ background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 16, padding: 24 }}>
          <h3 style={{ color: "#1e293b", fontSize: 15, fontWeight: 600, margin: "0 0 20px" }}>Активность за 7 дней</h3>
          <MiniBar data={chartData} />
        </div>
        <div style={{ background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <h3 style={{ color: "#1e293b", fontSize: 15, fontWeight: 600, margin: "0 0 16px" }}>eNPS (Q1 2025)</h3>
          <ENPSGauge value={enps} />
        </div>
      </div>

      <div style={{ background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 16, padding: 24, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ color: "#1e293b", fontSize: 15, fontWeight: 600, margin: 0 }}>Активные опросы</h3>
          <button onClick={() => setPage("surveys")} style={{ background: "transparent", border: "none", color: "#e53935", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>Все опросы →</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {activeSurveys.map(s => {
            const rCount = responses.filter(r => r.surveyId === s.id).length;
            const tCount = users.filter(u => s.targetRoles.includes(u.role)).length;
            const pct = tCount ? Math.min(100, Math.round(rCount / tCount * 100)) : 0;
            return (
              <div key={s.id}>
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 4 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#1e293b", fontSize: 13, fontWeight: 500 }}>{s.title}</div>
                  </div>
                  <div style={{ textAlign: "right", minWidth: 70 }}>
                    <div style={{ color: "#1e293b", fontWeight: 600, fontSize: 13 }}>{pct}%</div>
                    <div style={{ color: "#bdbdbd", fontSize: 11 }}>{rCount}/{tCount}</div>
                  </div>
                  <button onClick={() => onViewSurvey(s)} style={{ padding: "5px 12px", background: "#f5f5f5", border: "1px solid #e0e0e0", borderRadius: 8, color: "#e53935", cursor: "pointer", fontSize: 12 }}>→</button>
                </div>
                <div style={{ height: 4, background: "#e0e0e0", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: "#e53935", borderRadius: 2 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 16, padding: 24 }}>
        <h3 style={{ color: "#1e293b", fontSize: 15, fontWeight: 600, margin: "0 0 18px" }}>Каналы уведомлений</h3>
        <div style={{ display: "flex", gap: 16 }}>
          {Object.entries(channelLabels).map(([ch, label]) => {
            const count = notifications.filter(n => n.channel === ch).length;
            const opened = notifications.filter(n => n.channel === ch && n.openedAt).length;
            return (
              <div key={ch} style={{ flex: 1, background: "#fafafa", borderRadius: 12, padding: "14px", textAlign: "center", border: "1px solid #e0e0e0" }}>
                <div style={{ color: "#1e293b", fontWeight: 600, fontSize: 16 }}>{count}</div>
                <div style={{ color: "#9e9e9e", fontSize: 11, marginTop: 2 }}>{label}</div>
                {count > 0 && <div style={{ color: "#e53935", fontSize: 11, marginTop: 4 }}>{Math.round(opened/count*100)}% CTR</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── EMPLOYEE HOME ────────────────────────────────────────────────────────────
const EmployeeHome = ({ user, surveys, responses, completions, onStart }) => {
  const available = surveys.filter(s => s.status === "active" && s.targetRoles.includes(user.role));
  const done = completions.filter(c => c.userId === user.id);
  const pending = available.filter(s => !done.some(d => d.surveyId === s.id));

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ color: "#1e293b", fontSize: 24, fontWeight: 600, margin: "0 0 6px" }}>
          Привет, {user.name.split(" ")[0]}!
        </h2>
        <p style={{ color: "#9e9e9e", margin: 0, fontSize: 13 }}>
          {pending.length > 0
            ? `У вас ${pending.length} ${pending.length === 1 ? "новый опрос" : "новых опроса"} для прохождения`
            : "Нет активных опросов. Возвращайтесь позже!"}
        </p>
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 28 }}>
        <StatCard icon="⏳" label="Ожидают прохождения" value={pending.length} />
        <StatCard icon="✓" label="Пройдено опросов" value={done.length} />
        <StatCard icon="▣" label="Всего доступно" value={available.length} />
      </div>

      {!user.pushEnabled && (
        <div style={{
          background: "#f5f5f5", border: "1px solid #e0e0e0",
          borderRadius: 14, padding: "16px 20px", marginBottom: 24,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ color: "#1e293b", fontWeight: 500, marginBottom: 4, fontSize: 13 }}>Включите push-уведомления</div>
            <div style={{ color: "#9e9e9e", fontSize: 12 }}>Получайте уведомления о новых опросах прямо в браузере</div>
          </div>
          <button style={{
            padding: "8px 18px", background: "#e53935",
            border: "none", borderRadius: 8, color: "#ffffff", fontSize: 12, fontWeight: 500, cursor: "pointer",
          }}>Включить</button>
        </div>
      )}

      {pending.length > 0 && (
        <>
          <h3 style={{ color: "#1e293b", fontSize: 16, fontWeight: 600, margin: "0 0 14px" }}>Ожидают прохождения</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 28 }}>
            {pending.map(s => (
              <SurveyCard key={s.id} survey={s} responses={responses} onStart={onStart} completions={completions} userId={user.id} />
            ))}
          </div>
        </>
      )}

      {done.length > 0 && (
        <>
          <h3 style={{ color: "#9e9e9e", fontSize: 14, fontWeight: 500, margin: "0 0 12px" }}>Пройденные</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {available.filter(s => done.some(d => d.surveyId === s.id)).map(s => (
              <SurveyCard key={s.id} survey={s} responses={responses} onStart={onStart} completions={completions} userId={user.id} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ─── EMPLOYEES LIST ───────────────────────────────────────────────────────────
const EmployeesList = ({ users, surveys, responses, completions }) => {
  const employees = users.filter(u => u.role !== "hr");
  return (
    <div>
      <h2 style={{ color: "#1e293b", fontSize: 22, fontWeight: 600, margin: "0 0 24px" }}>Сотрудники</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {employees.map(u => {
          const done = completions.filter(c => c.userId === u.id).length;
          return (
            <div key={u.id} style={{ background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 16, padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#e53935", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff", fontWeight: 600, fontSize: 13 }}>{u.avatar}</div>
                <div>
                  <div style={{ color: "#1e293b", fontWeight: 500, fontSize: 14 }}>{u.name}</div>
                  <div style={{ color: "#9e9e9e", fontSize: 12 }}>{u.dept} · {u.city}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#9e9e9e" }}>
                <span>✓ {done} опросов</span>
                <span>{u.pushEnabled ? "Push" : "SMS"}</span>
                {u.tgLinked && <span>TG</span>}
              </div>
              <div style={{ marginTop: 10, padding: "4px 8px", background: "#f5f5f5", borderRadius: 8, color: "#616161", fontSize: 11, display: "inline-block" }}>
                {u.role === "manager" ? "Руководитель" : "Сотрудник"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── PROFILE PAGE ─────────────────────────────────────────────────────────────
const ProfilePage = ({ user, onUpdate, toast }) => {
  const [settings, setSettings] = useState({
    pushEnabled: user.pushEnabled, tgLinked: user.tgLinked,
    emailNotif: user.emailNotif, smsEnabled: user.smsEnabled,
    doNotDisturb: user.doNotDisturb,
  });
  const [notifTime, setNotifTime] = useState("morning");

  const save = () => {
    const users = DB.get("users") || [];
    const updated = users.map(u => u.id === user.id ? { ...u, ...settings } : u);
    DB.set("users", updated);
    onUpdate({ ...user, ...settings });
    toast("Настройки сохранены", "success");
  };

  const Toggle = ({ label, icon, desc, value, onChange }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid #e0e0e0" }}>
      <div>
        <div style={{ color: "#1e293b", fontSize: 13, fontWeight: 500 }}>{icon} {label}</div>
        {desc && <div style={{ color: "#bdbdbd", fontSize: 11, marginTop: 2 }}>{desc}</div>}
      </div>
      <button onClick={() => onChange(!value)} style={{
        width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer",
        background: value ? "#e53935" : "#e0e0e0",
        position: "relative", transition: "background .2s",
      }}>
        <span style={{
          position: "absolute", top: 2, left: value ? 20 : 2, width: 18, height: 18,
          background: "#ffffff", borderRadius: "50%", transition: "left .2s",
        }} />
      </button>
    </div>
  );

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <h2 style={{ color: "#1e293b", fontSize: 22, fontWeight: 600, margin: "0 0 28px" }}>Профиль</h2>

      <div style={{ background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 16, padding: 24, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 20 }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#e53935", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff", fontSize: 20, fontWeight: 600 }}>{user.avatar}</div>
          <div>
            <div style={{ color: "#1e293b", fontSize: 18, fontWeight: 600 }}>{user.name}</div>
            <div style={{ color: "#9e9e9e", fontSize: 13 }}>{user.dept} · {user.city}</div>
            <div style={{ color: "#1e293b", fontSize: 12, marginTop: 4, opacity: 0.7 }}>{user.phone}</div>
          </div>
        </div>
      </div>

      <div style={{ background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 16, padding: 24, marginBottom: 20 }}>
        <h3 style={{ color: "#1e293b", fontSize: 13, fontWeight: 600, margin: "0 0 4px", letterSpacing: 0.5 }}>Настройки уведомлений</h3>
        <Toggle label="Web Push" icon="" desc="Уведомления в браузере" value={settings.pushEnabled} onChange={v => setSettings(s => ({ ...s, pushEnabled: v }))} />
        <Toggle label="SMS" icon="📱" desc="Резервный канал" value={settings.smsEnabled} onChange={v => setSettings(s => ({ ...s, smsEnabled: v }))} />
        <Toggle label="Telegram-бот" icon="" desc="Уведомления через бот" value={settings.tgLinked} onChange={v => setSettings(s => ({ ...s, tgLinked: v }))} />
        <Toggle label="E-mail" icon="" desc="Корпоративная рассылка" value={settings.emailNotif} onChange={v => setSettings(s => ({ ...s, emailNotif: v }))} />

        <div style={{ marginTop: 20 }}>
          <div style={{ color: "#616161", fontSize: 12, marginBottom: 10 }}>Предпочтительное время уведомлений</div>
          <div style={{ display: "flex", gap: 10 }}>
            {[["morning", "Утром (9–12)"], ["day", "Днём (12–17)"], ["evening", "Вечером (17–20)"]].map(([v, l]) => (
              <button key={v} onClick={() => setNotifTime(v)} style={{
                flex: 1, padding: "7px", borderRadius: 8, border: `1px solid ${notifTime === v ? "#e53935" : "#e0e0e0"}`,
                background: notifTime === v ? "#ffebee" : "#ffffff",
                color: notifTime === v ? "#c62828" : "#9e9e9e", cursor: "pointer", fontSize: 11, fontFamily: "inherit",
              }}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      <button onClick={save} style={{
        width: "100%", padding: "12px", background: "#e53935",
        border: "none", borderRadius: 12, color: "#ffffff", fontSize: 14, fontWeight: 500, cursor: "pointer",
      }}>Сохранить настройки</button>
    </div>
  );
};

// ─── ANALYTICS PAGE ───────────────────────────────────────────────────────────
const AnalyticsPage = ({ surveys, responses, users, notifications }) => {
  const [tab, setTab] = useState("overview");
  const depts = [...new Set(users.map(u => u.dept))];

  const deptStats = depts.map(dept => {
    const deptUsers = users.filter(u => u.dept === dept);
    const activeSurveys = surveys.filter(s => s.status === "active");
    let total = 0, answered = 0;
    activeSurveys.forEach(s => {
      deptUsers.forEach(u => {
        if (s.targetRoles.includes(u.role)) {
          total++;
          if (responses.some(r => r.surveyId === s.id && r.userId === u.id)) answered++;
        }
      });
    });
    return { dept, total, answered, rate: total ? Math.round(answered / total * 100) : 0 };
  });

  return (
    <div>
      <h2 style={{ color: "#1e293b", fontSize: 22, fontWeight: 600, margin: "0 0 24px" }}>Аналитика</h2>

      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "#f5f5f5", borderRadius: 12, padding: 4 }}>
        {["overview", "enps", "channels"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: "10px", borderRadius: 9, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 500,
            background: tab === t ? "#ffffff" : "transparent",
            color: tab === t ? "#1e293b" : "#9e9e9e",
            boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
          }}>
            {{ overview: "Обзор", enps: "eNPS", channels: "Каналы" }[t]}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div>
          <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
            <StatCard icon="✓" label="Всего ответов" value={responses.length} />
            <StatCard icon="≡" label="Опросов проведено" value={surveys.filter(s => s.status !== "draft").length} />
            <StatCard icon="◷" label="Участников" value={new Set(responses.map(r => r.userId || r.sessionId)).size} />
          </div>

          <div style={{ background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 16, padding: 24, marginBottom: 20 }}>
            <h3 style={{ color: "#1e293b", fontSize: 15, fontWeight: 600, margin: "0 0 18px" }}>Охват по подразделениям</h3>
            {deptStats.map(d => (
              <div key={d.dept} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ color: "#616161", fontSize: 13 }}>{d.dept}</span>
                  <span style={{ color: "#9e9e9e", fontSize: 12 }}>{d.answered}/{d.total} · <span style={{ color: "#e53935", fontWeight: 500 }}>{d.rate}%</span></span>
                </div>
                <div style={{ height: 6, background: "#e0e0e0", borderRadius: 3 }}>
                  <div style={{ height: "100%", width: `${d.rate}%`, background: d.rate >= 60 ? "#2e7d32" : d.rate >= 30 ? "#f57c00" : "#c62828", borderRadius: 3, transition: "width .6s" }} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 16, padding: 24 }}>
            <h3 style={{ color: "#1e293b", fontSize: 15, fontWeight: 600, margin: "0 0 18px" }}>Опросы</h3>
            {surveys.map(s => {
              const r = responses.filter(x => x.surveyId === s.id).length;
              const st = statusColors[s.status];
              return (
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #e0e0e0" }}>
                  <div>
                    <span style={{ background: st.bg, color: st.text, padding: "2px 6px", borderRadius: 20, fontSize: 10, marginRight: 10 }}>{st.label}</span>
                    <span style={{ color: "#1e293b", fontSize: 13 }}>{s.title}</span>
                  </div>
                  <div style={{ color: "#9e9e9e", fontSize: 12 }}>{r} ответов</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "enps" && (
        <div>
          <div style={{ display: "flex", gap: 20, marginBottom: 24, flexWrap: "wrap" }}>
            <div style={{ flex: 2, background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 16, padding: 24, display: "flex", alignItems: "center", gap: 32 }}>
              <ENPSGauge value={calcENPS(responses, "s1")} />
              <div>
                <h3 style={{ color: "#1e293b", margin: "0 0 12px", fontSize: 16, fontWeight: 600 }}>eNPS Q1 2025</h3>
                {(() => {
                  const npsAnswers = responses.filter(r => r.surveyId === "s1").map(r => r.answers?.q1).filter(v => typeof v === "number");
                  const promoters = npsAnswers.filter(v => v >= 9).length;
                  const passives = npsAnswers.filter(v => v >= 7 && v < 9).length;
                  const detractors = npsAnswers.filter(v => v <= 6).length;
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {[["Сторонники (9–10)", promoters, "#2e7d32"], ["Нейтральные (7–8)", passives, "#f57c00"], ["Критики (0–6)", detractors, "#c62828"]].map(([l, v, c]) => (
                        <div key={l} style={{ display: "flex", justifyContent: "space-between", gap: 20 }}>
                          <span style={{ color: "#9e9e9e", fontSize: 12 }}>{l}</span>
                          <span style={{ color: c, fontWeight: 600, fontSize: 14 }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 16, padding: 20, flex: 1 }}>
                <div style={{ color: "#9e9e9e", fontSize: 12 }}>Среднее по Q4 2024</div>
                <div style={{ color: "#1e293b", fontSize: 26, fontWeight: 600, marginTop: 6 }}>+18</div>
                <div style={{ color: "#2e7d32", fontSize: 11, marginTop: 4 }}>↑ +22 vs Q4</div>
              </div>
              <div style={{ background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 16, padding: 20, flex: 1 }}>
                <div style={{ color: "#9e9e9e", fontSize: 12 }}>Участие</div>
                <div style={{ color: "#1e293b", fontSize: 26, fontWeight: 600, marginTop: 6 }}>5 / 8</div>
                <div style={{ color: "#f57c00", fontSize: 11, marginTop: 4 }}>62.5% охват</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "channels" && (
        <NotificationsTab users={users} />
      )}
    </div>
  );
};

// ─── SETTINGS PAGE ────────────────────────────────────────────────────────────
const SettingsPage = ({ user, toast }) => {
  const [gdpr, setGdpr] = useState(true);
  const [smsLimit, setSmsLimit] = useState(3);
  const [dailyLimit, setDailyLimit] = useState(5);

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <h2 style={{ color: "#1e293b", fontSize: 22, fontWeight: 600, margin: "0 0 28px" }}>Настройки системы</h2>

      <div style={{ background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 16, padding: 24, marginBottom: 20 }}>
        <h3 style={{ color: "#1e293b", fontSize: 13, fontWeight: 600, margin: "0 0 18px", letterSpacing: 0.5 }}>Соответствие 152-ФЗ и антиспам</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: "#1e293b", fontSize: 13 }}>Согласие на рассылку (152-ФЗ)</div>
              <div style={{ color: "#bdbdbd", fontSize: 11, marginTop: 2 }}>Запрашивать согласие при первом входе</div>
            </div>
            <button onClick={() => setGdpr(!gdpr)} style={{
              width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer",
              background: gdpr ? "#e53935" : "#e0e0e0",
              position: "relative", transition: "background .2s",
            }}>
              <span style={{ position: "absolute", top: 2, left: gdpr ? 20 : 2, width: 18, height: 18, background: "#ffffff", borderRadius: "50%", transition: "left .2s" }} />
            </button>
          </div>
          <div>
            <div style={{ color: "#1e293b", fontSize: 13, marginBottom: 6 }}>Лимит SMS в сутки на сотрудника</div>
            <input type="number" value={smsLimit} onChange={e => setSmsLimit(+e.target.value)} min={1} max={10}
              style={{ padding: "7px 10px", background: "#fafafa", border: "1px solid #e0e0e0", borderRadius: 8, color: "#1e293b", fontSize: 13, fontFamily: "inherit", width: 70 }} />
          </div>
          <div>
            <div style={{ color: "#1e293b", fontSize: 13, marginBottom: 6 }}>Общий лимит уведомлений в сутки</div>
            <input type="number" value={dailyLimit} onChange={e => setDailyLimit(+e.target.value)} min={1} max={20}
              style={{ padding: "7px 10px", background: "#fafafa", border: "1px solid #e0e0e0", borderRadius: 8, color: "#1e293b", fontSize: 13, fontFamily: "inherit", width: 70 }} />
          </div>
        </div>
      </div>

      <div style={{ background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 16, padding: 24, marginBottom: 20 }}>
        <h3 style={{ color: "#1e293b", fontSize: 13, fontWeight: 600, margin: "0 0 18px", letterSpacing: 0.5 }}>Каскадная логика уведомлений</h3>
        {[
          { p: 1, cond: "Есть активная Push-подписка", action: "Отправить push на все устройства" },
          { p: 2, cond: "Push не доставлен за 4 часа", action: "Уведомление в Telegram (если привязан)" },
          { p: 3, cond: "Telegram не привязан / не доставлен за 8 ч", action: "SMS на номер телефона" },
          { p: 4, cond: "Опрос >7 дней, сотрудник не прошёл", action: "Напоминание на корпоративный e-mail" },
          { p: 5, cond: "До окончания 24 часа", action: "Финальное push/SMS-напоминание" },
        ].map(row => (
          <div key={row.p} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 0", borderBottom: "1px solid #e0e0e0" }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#ffebee", display: "flex", alignItems: "center", justifyContent: "center", color: "#e53935", fontWeight: 600, fontSize: 12, flexShrink: 0, marginTop: 2 }}>{row.p}</div>
            <div>
              <div style={{ color: "#9e9e9e", fontSize: 12 }}>{row.cond}</div>
              <div style={{ color: "#1e293b", fontSize: 13, fontWeight: 500, marginTop: 2 }}>→ {row.action}</div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={() => toast("Настройки сохранены", "success")} style={{
        padding: "12px 28px", background: "#e53935",
        border: "none", borderRadius: 12, color: "#ffffff", fontSize: 14, fontWeight: 500, cursor: "pointer",
      }}>Сохранить</button>
    </div>
  );
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState(null);
  const [surveys, setSurveys] = useState([]);
  const [responses, setResponses] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeSurvey, setActiveSurvey] = useState(null);
  const [viewingSurvey, setViewingSurvey] = useState(null);
  const [editingSurvey, setEditingSurvey] = useState(null);
  const { toasts, setToasts, show: toast } = useToast();

  useEffect(() => { initDB(); }, []);

  const loadData = useCallback(() => {
    setSurveys(DB.get("surveys") || []);
    setResponses(DB.get("responses") || []);
    const allNotifs = DB.get("notifications") || [];
    setNotifications(allNotifs);
    setCompletions(DB.get("completions") || []);
    setUsers(DB.get("users") || []);
  }, []);

  useEffect(() => { if (user) loadData(); }, [user, loadData]);

  const markNotificationsAsRead = useCallback((userId) => {
    const notifs = DB.get("notifications") || [];
    const updated = notifs.map(n => 
      n.userId === userId && !n.isRead ? { ...n, isRead: true } : n
    );
    DB.set("notifications", updated);
    setNotifications(updated);
  }, []);

  const handleLogin = (u) => {
    setUser(u);
    setPage(u.role === "hr" ? "dashboard" : "home");
    setTimeout(() => {
      toast("Новый опрос: eNPS Q1 2025", "notif", "");
    }, 2500);
  };

  const handleLogout = () => { setUser(null); setPage(null); };
  const handleUpdateUser = (u) => { setUser(u); loadData(); };

  const unreadNotifsCount = notifications.filter(n => n.userId === user?.id && !n.isRead).length;

  const handleNotificationClick = (surveyId) => {
    const survey = surveys.find(s => s.id === surveyId);
    if (survey && survey.status === "active") {
      setActiveSurvey(survey);
    }
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    if (newPage === "notifications" && user) {
      markNotificationsAsRead(user.id);
    }
  };

  const renderPage = () => {
    if (!user) return null;
    const isHR = user.role === "hr";

    if (activeSurvey) return (
      <TakeSurvey survey={activeSurvey} user={user} onSubmit={() => {}} onBack={() => { setActiveSurvey(null); loadData(); }} />
    );
    if (viewingSurvey) return (
      <SurveyResults survey={viewingSurvey} responses={responses} users={users} onBack={() => { setViewingSurvey(null); loadData(); }} />
    );
    if (page === "create" || editingSurvey) return (
      <SurveyBuilder survey={editingSurvey} user={user} toast={toast} onSave={() => { setEditingSurvey(null); setPage("surveys"); loadData(); }} onBack={() => { setEditingSurvey(null); setPage(isHR ? "surveys" : "my_surveys"); }} />
    );

    if (isHR) {
      if (page === "dashboard") return <HRDashboard surveys={surveys} responses={responses} users={users} notifications={notifications} setPage={handlePageChange} onViewSurvey={s => setViewingSurvey(s)} />;
      if (page === "surveys") return (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <h2 style={{ color: "#1e293b", fontSize: 22, fontWeight: 600, margin: 0 }}>Опросы</h2>
            <button onClick={() => setPage("create")} style={{ padding: "8px 18px", background: "#e53935", border: "none", borderRadius: 10, color: "#ffffff", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>+ Создать опрос</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {surveys.map(s => <SurveyCard key={s.id} survey={s} responses={responses} isHR onView={sv => setViewingSurvey(sv)} onEdit={sv => setEditingSurvey(sv)} />)}
          </div>
        </div>
      );
      if (page === "analytics") return <AnalyticsPage surveys={surveys} responses={responses} users={users} notifications={notifications} />;
      if (page === "notifications") return <NotificationsTab users={users} />;
      if (page === "employees") return <EmployeesList users={users} surveys={surveys} responses={responses} completions={completions} />;
      if (page === "settings") return <SettingsPage user={user} toast={toast} />;
    }

    if (page === "home") return <EmployeeHome user={user} surveys={surveys} responses={responses} completions={completions} onStart={s => setActiveSurvey(s)} />;
    if (page === "my_surveys") return (
      <div>
        <h2 style={{ color: "#1e293b", fontSize: 22, fontWeight: 600, margin: "0 0 24px" }}>Мои опросы</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {surveys.filter(s => s.status === "active" && s.targetRoles.includes(user.role)).map(s => (
            <SurveyCard key={s.id} survey={s} responses={responses} onStart={sv => setActiveSurvey(sv)} completions={completions} userId={user.id} />
          ))}
        </div>
      </div>
    );
    if (page === "notifications") return (
      <div>
        <h2 style={{ color: "#1e293b", fontSize: 22, fontWeight: 600, margin: "0 0 24px" }}>Уведомления</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {notifications.filter(n => n.userId === user.id).length === 0
            ? <div style={{ color: "#bdbdbd", textAlign: "center", padding: "60px 0" }}>Уведомлений пока нет</div>
            : notifications.filter(n => n.userId === user.id).map(n => {
                const s = surveys.find(sv => sv.id === n.surveyId);
                const isCompleted = completions.some(c => c.surveyId === s?.id && c.userId === user.id);
                return (
                  <div 
                    key={n.id} 
                    onClick={() => !isCompleted && s?.status === "active" && handleNotificationClick(s.id)}
                    style={{ 
                      background: "#ffffff", border: "1px solid #e0e0e0", borderRadius: 14, padding: 16, 
                      display: "flex", alignItems: "center", gap: 14,
                      cursor: !isCompleted && s?.status === "active" ? "pointer" : "default",
                      transition: "box-shadow .2s",
                      opacity: isCompleted ? 0.7 : 1,
                    }}
                    onMouseEnter={e => { if (!isCompleted && s?.status === "active") e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)"; }}
                    onMouseLeave={e => { if (!isCompleted && s?.status === "active") e.currentTarget.style.boxShadow = "none"; }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "#1e293b", fontSize: 13, fontWeight: 500 }}>Новый опрос: {s?.title}</div>
                      <div style={{ color: "#bdbdbd", fontSize: 11, marginTop: 2 }}>{fmtDate(n.sentAt)}</div>
                      {isCompleted && <div style={{ color: "#2e7d32", fontSize: 11, marginTop: 4 }}>Пройден</div>}
                      {!n.isRead && !isCompleted && <div style={{ color: "#e53935", fontSize: 10, marginTop: 2 }}>● Новое</div>}
                    </div>
                    {!isCompleted && s?.status === "active" && (
                      <div style={{ padding: "6px 12px", background: "#e53935", borderRadius: 8, color: "#ffffff", fontSize: 11, fontWeight: 500 }}>
                        Перейти →
                      </div>
                    )}
                    {isCompleted && (
                      <div style={{ padding: "6px 12px", background: "#e8f5e9", borderRadius: 8, color: "#2e7d32", fontSize: 11, fontWeight: 500 }}>
                        Пройден
                      </div>
                    )}
                  </div>
                );
              })}
        </div>
      </div>
    );
    if (page === "profile") return <ProfilePage user={user} onUpdate={handleUpdateUser} toast={toast} />;

    return null;
  };

  if (!user) return (
    <>
      <style>{`* { box-sizing: border-box; } @keyframes slideIn { from { transform: translateX(40px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }`}</style>
      <Toast toasts={toasts} setToasts={setToasts} />
      <AuthScreen onLogin={handleLogin} />
    </>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f5f5f5", fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&display=swap');
        * { box-sizing: border-box; }
        @keyframes slideIn { from { transform: translateX(40px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.5); }
      `}</style>
      <Toast toasts={toasts} setToasts={setToasts} />
      <Sidebar user={user} currentPage={page} setPage={handlePageChange} onLogout={handleLogout} notifCount={unreadNotifsCount} />
      <main style={{ flex: 1, padding: "32px 36px", overflowY: "auto", maxHeight: "100vh" }}>
        {renderPage()}
      </main>
    </div>
  );
}