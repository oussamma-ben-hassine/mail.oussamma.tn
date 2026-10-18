'use client';

import React, { useState, useEffect } from 'react';

interface MailMessage {
  id: string;
  uid: number;
  folder: string;
  from: { name?: string; email: string };
  to: Array<{ name?: string; email: string }>;
  subject: string;
  date: string;
  preview: string;
  isRead: boolean;
  isStarred: boolean;
  isFlaggedUrgent: boolean;
  hasAttachments: boolean;
  sizeBytes: number;
  labels: string[];
  htmlBody?: string;
  textBody?: string;
  attachments?: Array<{ id: string; filename: string; mimeType: string; size: number }>;
}

export default function MailApp() {
  const [activeTab, setActiveTab] = useState<'webmail' | 'admin'>('webmail');
  const [activeFolder, setActiveFolder] = useState<string>('INBOX');
  const [selectedMessage, setSelectedMessage] = useState<MailMessage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiDraft, setAiDraft] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Formulaire de rédaction
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [isDriveAttached, setIsDriveAttached] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendSuccessToast, setSendSuccessToast] = useState(false);

  // Données initiales de démonstration
  const [messages, setMessages] = useState<MailMessage[]>([
    {
      id: 'msg-welcome-001',
      uid: 101,
      folder: 'INBOX',
      from: { name: 'Écosystème oussamma.tn', email: 'admin@oussamma.tn' },
      to: [{ name: 'Oussamma Ben Hassine', email: 'contact@oussamma.tn' }],
      subject: 'Bienvenue sur votre nouvelle messagerie Mail.oussamma.tn',
      date: new Date(Date.now() - 3600000).toISOString(),
      preview: 'Votre messagerie unifiée est désormais opérationnelle avec intégration SSO et Drive...',
      isRead: false,
      isStarred: true,
      isFlaggedUrgent: true,
      hasAttachments: false,
      sizeBytes: 4200,
      labels: ['Écosystème', 'Important'],
      htmlBody: `
        <div style="font-family: sans-serif; line-height: 1.6; color: #1e293b;">
          <h2 style="color: #2563eb;">Bienvenue sur Mail.oussamma.tn</h2>
          <p>Bonjour Oussamma,</p>
          <p>Votre plateforme de messagerie indépendante est prête. Elle combine :</p>
          <ul>
            <li><strong>Webmail moderne :</strong> PWA mobile-first avec dossiers, étiquettes et conversations.</li>
            <li><strong>Mailing transactionnel :</strong> API pour toutes les applications (cv, messenger, drive).</li>
            <li><strong>IA intégrée via LiteLLM :</strong> Résumés automatiques et réponses assistées.</li>
            <li><strong>ByteVault Drive :</strong> Pièces jointes directes et liens de partage sécurisés.</li>
          </ul>
          <p>Bonne utilisation !</p>
        </div>
      `,
      textBody: 'Bienvenue sur Mail.oussamma.tn. Votre plateforme de messagerie est prête.',
    },
    {
      id: 'msg-supervisor-002',
      uid: 102,
      folder: 'INBOX',
      from: { name: 'Superviseur Central', email: 'alertes@supervisor.oussamma.tn' },
      to: [{ name: 'Oussamma Ben Hassine', email: 'contact@oussamma.tn' }],
      subject: '[Télémétrie] Rapport d’activité hebdomadaire des services',
      date: new Date(Date.now() - 86400000).toISOString(),
      preview: 'Tous les services oussamma.tn affichent un taux de disponibilité de 99.98%...',
      isRead: true,
      isStarred: false,
      isFlaggedUrgent: false,
      hasAttachments: true,
      sizeBytes: 18400,
      labels: ['Rapports'],
      htmlBody: '<p>Tous les services oussamma.tn affichent un taux de disponibilité de 99.98% sur les 7 derniers jours.</p>',
      textBody: 'Tous les services oussamma.tn affichent un taux de disponibilité de 99.98% sur les 7 derniers jours.',
      attachments: [
        {
          id: 'att-1',
          filename: 'rapport-hebdo-2026.pdf',
          mimeType: 'application/pdf',
          size: 14200,
        },
      ],
    },
  ]);

  // Initialisation du thème
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'dark' : 'light');
    if (messages.length > 0 && !selectedMessage) {
      setSelectedMessage(messages[0]);
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('collify_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('collify_theme', 'light');
    }
  };

  const handleSelectMessage = (msg: MailMessage) => {
    setSelectedMessage(msg);
    setAiSummary(null);
    setAiDraft(null);
    // Mark as read
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m));
  };

  const handleToggleStar = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMessages(prev => prev.map(m => m.id === id ? { ...m, isStarred: !m.isStarred } : m));
    if (selectedMessage && selectedMessage.id === id) {
      setSelectedMessage(prev => prev ? { ...prev, isStarred: !prev.isStarred } : null);
    }
  };

  const handleSummarizeWithAi = () => {
    if (!selectedMessage) return;
    setIsAiLoading(true);
    setTimeout(() => {
      setAiSummary(
        `Résumé IA (LiteLLM) : Cet email confirme le déploiement opérationnel de la nouvelle plateforme Mail.oussamma.tn, intégrant le Webmail PWA, l'API transactionnelle, ByteVault Drive et le superviseur d'écosystème.`
      );
      setIsAiLoading(false);
    }, 800);
  };

  const handleGenerateReplyDraft = () => {
    if (!selectedMessage) return;
    setIsAiLoading(true);
    setTimeout(() => {
      setAiDraft(
        `Bonjour,\n\nMerci pour cette confirmation. La plateforme fonctionne parfaitement et toutes les intégrations de l'écosystème oussamma.tn sont opérationnelles.\n\nCordialement,\nOussamma Ben Hassine`
      );
      setIsAiLoading(false);
    }, 1000);
  };

  const handleSendEmail = () => {
    if (!composeTo || !composeSubject) return;
    setIsSending(true);
    setTimeout(() => {
      const newSentMsg: MailMessage = {
        id: `sent-${Date.now()}`,
        uid: Date.now(),
        folder: 'SENT',
        from: { name: 'Oussamma Ben Hassine', email: 'contact@oussamma.tn' },
        to: [{ email: composeTo }],
        subject: composeSubject,
        date: new Date().toISOString(),
        preview: composeBody.substring(0, 80),
        isRead: true,
        isStarred: false,
        isFlaggedUrgent: false,
        hasAttachments: isDriveAttached,
        sizeBytes: 1500,
        labels: [],
        htmlBody: `<p>${composeBody.replace(/\n/g, '<br/>')}</p>`,
        textBody: composeBody,
      };

      setMessages(prev => [newSentMsg, ...prev]);
      setIsSending(false);
      setIsComposeOpen(false);
      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');
      setIsDriveAttached(false);
      setSendSuccessToast(true);
      setTimeout(() => setSendSuccessToast(false), 4000);
    }, 800);
  };

  const filteredMessages = messages.filter(m => {
    if (activeFolder === 'STARRED') return m.isStarred;
    if (activeFolder === 'UNREAD') return !m.isRead;
    if (m.folder !== activeFolder && activeFolder !== 'ALL') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        m.subject.toLowerCase().includes(q) ||
        m.from.email.toLowerCase().includes(q) ||
        m.preview.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans">
      {/* Toast de confirmation */}
      {sendSuccessToast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl text-sm font-semibold transition-all animate-bounce">
          <span className="material-symbols-outlined text-lg">check_circle</span>
          <span>Message transmis avec succès !</span>
        </div>
      )}

      {/* ===================== SIDEBAR GAUCHE ===================== */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 flex flex-col justify-between p-4 shrink-0">
        <div>
          {/* Logo & Marque */}
          <div className="flex items-center justify-between mb-6 px-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <span className="material-symbols-outlined text-xl">mail</span>
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-slate-100">
                  Mail
                </span>
                <span className="text-xs text-blue-600 font-semibold block -mt-1">
                  .oussamma.tn
                </span>
              </div>
            </div>

            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
              title="Changer de thème"
            >
              <span className="material-symbols-outlined text-lg">
                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
              </span>
            </button>
          </div>

          {/* Bouton Nouveau Message */}
          <button
            onClick={() => setIsComposeOpen(true)}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl shadow-xs transition-all mb-5"
          >
            <span className="material-symbols-outlined text-lg">edit</span>
            <span>Nouveau message</span>
          </button>

          {/* Onglets Principaux (Webmail vs Admin) */}
          <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl mb-4 text-xs font-bold">
            <button
              onClick={() => setActiveTab('webmail')}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                activeTab === 'webmail'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Webmail
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                activeTab === 'admin'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Administration
            </button>
          </div>

          {/* Menu Dossiers (Mode Webmail) */}
          {activeTab === 'webmail' && (
            <nav className="space-y-1 text-xs font-semibold">
              {[
                { id: 'INBOX', label: 'Boîte de réception', icon: 'inbox', count: 1 },
                { id: 'UNREAD', label: 'Non lus', icon: 'mark_email_unread', count: 1 },
                { id: 'STARRED', label: 'Favoris', icon: 'star', count: 1 },
                { id: 'SENT', label: 'Envoyés', icon: 'send' },
                { id: 'DRAFTS', label: 'Brouillons', icon: 'draft' },
                { id: 'ARCHIVE', label: 'Archives', icon: 'archive' },
                { id: 'SPAM', label: 'Spam', icon: 'report' },
                { id: 'TRASH', label: 'Corbeille', icon: 'delete' },
              ].map(folder => (
                <button
                  key={folder.id}
                  onClick={() => setActiveFolder(folder.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all ${
                    activeFolder === folder.id
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-lg">{folder.icon}</span>
                    <span>{folder.label}</span>
                  </div>
                  {folder.count && (
                    <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {folder.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          )}

          {/* Menu Administration (Mode Admin) */}
          {activeTab === 'admin' && (
            <div className="space-y-1 text-xs font-semibold">
              <a
                href="#dash"
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 font-bold"
              >
                <span className="material-symbols-outlined text-lg">dashboard</span>
                <span>Dashboard Global</span>
              </a>
              <a
                href="#dns"
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <span className="material-symbols-outlined text-lg">dns</span>
                <span>Validation DNS (SPF/DKIM)</span>
              </a>
              <a
                href="#apps"
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <span className="material-symbols-outlined text-lg">key</span>
                <span>Applications & Clés API</span>
              </a>
              <a
                href="#templates"
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <span className="material-symbols-outlined text-lg">description</span>
                <span>Templates Versionnés</span>
              </a>
            </div>
          )}
        </div>

        {/* Profil connecté en bas */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
              OB
            </div>
            <div className="overflow-hidden">
              <div className="font-bold truncate text-slate-900 dark:text-slate-100">Oussamma B.</div>
              <div className="text-[11px] text-slate-400 truncate">contact@oussamma.tn</div>
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200/50 dark:border-slate-700">
            <span>SSO OIDC Certifié</span>
            <span className="text-emerald-500 font-bold">En ligne</span>
          </div>
        </div>
      </aside>

      {/* ===================== CONTENU PRINCIPAL ===================== */}
      {activeTab === 'webmail' ? (
        <div className="flex-1 flex overflow-hidden">
          {/* Colonne Liste des Messages */}
          <div className="w-80 md:w-96 border-r border-slate-200/80 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900 shrink-0">
            {/* Barre de Recherche */}
            <div className="p-3 border-b border-slate-200/80 dark:border-slate-800">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-2.5 top-2 text-slate-400 text-lg">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Rechercher un email..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 text-xs pl-8 pr-3 py-2 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Liste scrollable */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredMessages.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Aucun message dans ce dossier
                </div>
              ) : (
                filteredMessages.map(msg => (
                  <div
                    key={msg.id}
                    onClick={() => handleSelectMessage(msg)}
                    className={`p-3.5 cursor-pointer transition-all ${
                      selectedMessage?.id === msg.id
                        ? 'bg-blue-50/70 dark:bg-blue-900/20 border-l-4 border-blue-600'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs truncate ${!msg.isRead ? 'font-extrabold text-slate-900 dark:text-slate-100' : 'font-medium text-slate-600 dark:text-slate-400'}`}>
                        {msg.from.name || msg.from.email}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-400">
                          {new Date(msg.date).toLocaleDateString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <button
                          onClick={e => handleToggleStar(msg.id, e)}
                          className={`material-symbols-outlined text-sm ${
                            msg.isStarred ? 'text-amber-400 fill-1' : 'text-slate-300 hover:text-slate-400'
                          }`}
                        >
                          star
                        </button>
                      </div>
                    </div>
                    <div className={`text-xs truncate mb-1 ${!msg.isRead ? 'font-bold text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}>
                      {msg.subject}
                    </div>
                    <div className="text-[11px] text-slate-400 line-clamp-2">
                      {msg.preview}
                    </div>
                    {msg.hasAttachments && (
                      <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                        <span className="material-symbols-outlined text-xs">attachment</span>
                        <span>Pièce jointe</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Colonne Détail de l'Email */}
          <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 overflow-y-auto">
            {selectedMessage ? (
              <div className="p-6 max-w-4xl w-full mx-auto space-y-4">
                {/* En-tête du message */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
                        {selectedMessage.subject}
                      </h2>
                      <div className="flex items-center gap-2 mt-2">
                        {selectedMessage.labels.map(lbl => (
                          <span
                            key={lbl}
                            className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full"
                          >
                            {lbl}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Actions rapides */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={handleSummarizeWithAi}
                        className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 transition-all"
                        title="Résumer via LiteLLM"
                      >
                        <span className="material-symbols-outlined text-sm">auto_awesome</span>
                        <span>Résumer IA</span>
                      </button>

                      <button
                        onClick={handleGenerateReplyDraft}
                        className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold px-2.5 py-1.5 rounded-xl transition-all"
                        title="Proposer une réponse IA"
                      >
                        <span className="material-symbols-outlined text-sm">reply</span>
                        <span>Répondre IA</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300">
                        {selectedMessage.from.name ? selectedMessage.from.name[0] : 'U'}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          {selectedMessage.from.name || selectedMessage.from.email}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          De : {selectedMessage.from.email}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-slate-400">
                      {new Date(selectedMessage.date).toLocaleString('fr-FR')}
                    </div>
                  </div>
                </div>

                {/* Bannière IA (Résumé ou Réponse) */}
                {isAiLoading && (
                  <div className="bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-4 flex items-center gap-3 text-xs text-indigo-700 dark:text-indigo-300 font-semibold animate-pulse">
                    <span className="material-symbols-outlined animate-spin text-lg">auto_awesome</span>
                    <span>Traitement sécurisé par la passerelle LiteLLM en cours...</span>
                  </div>
                )}

                {aiSummary && (
                  <div className="bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-4 text-xs space-y-2">
                    <div className="flex items-center justify-between font-bold text-indigo-900 dark:text-indigo-200">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">auto_awesome</span>
                        Synthèse automatique LiteLLM
                      </span>
                      <button
                        onClick={() => setAiSummary(null)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        ×
                      </button>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      {aiSummary}
                    </p>
                  </div>
                )}

                {aiDraft && (
                  <div className="bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 text-xs space-y-2.5">
                    <div className="flex items-center justify-between font-bold text-blue-900 dark:text-blue-200">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">edit_note</span>
                        Proposition de réponse (Validation humaine requise)
                      </span>
                      <button
                        onClick={() => setAiDraft(null)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        ×
                      </button>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 whitespace-pre-line text-slate-800 dark:text-slate-200">
                      {aiDraft}
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setComposeTo(selectedMessage.from.email);
                          setComposeSubject(`Re: ${selectedMessage.subject}`);
                          setComposeBody(aiDraft);
                          setIsComposeOpen(true);
                          setAiDraft(null);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-1.5 rounded-xl transition-all"
                      >
                        Utiliser ce brouillon
                      </button>
                    </div>
                  </div>
                )}

                {/* Corps de l'email sécurisé */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs">
                  {selectedMessage.htmlBody ? (
                    <div
                      className="prose dark:prose-invert max-w-none text-sm text-slate-800 dark:text-slate-200 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: selectedMessage.htmlBody }}
                    />
                  ) : (
                    <div className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {selectedMessage.textBody}
                    </div>
                  )}
                </div>

                {/* Pièces jointes & Intégration ByteVault Drive */}
                {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-2">
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Pièces jointes ({selectedMessage.attachments.length})
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedMessage.attachments.map(att => (
                        <div
                          key={att.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700 text-xs"
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className="material-symbols-outlined text-blue-600">
                              description
                            </span>
                            <div className="truncate">
                              <div className="font-semibold truncate text-slate-800 dark:text-slate-200">
                                {att.filename}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {Math.round(att.size / 1024)} Ko
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => alert(`Téléchargement de ${att.filename}`)}
                              className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                              title="Télécharger"
                            >
                              <span className="material-symbols-outlined text-sm">download</span>
                            </button>
                            <button
                              onClick={() => alert(`Fichier sauvegardé dans votre ByteVault Drive à l'adresse drive.oussamma.tn`)}
                              className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-lg font-semibold text-[10px]"
                              title="Enregistrer dans ByteVault Drive"
                            >
                              <span className="material-symbols-outlined text-xs">cloud_upload</span>
                              <span>Drive</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                Sélectionnez un message pour en visualiser le contenu
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ===================== TAB ADMINISTRATION ===================== */
        <div className="flex-1 overflow-y-auto p-8 space-y-6 max-w-5xl mx-auto">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Administration & Télémétrie
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Supervision du serveur Mailu, domaines, clés applicatives et conformité DNS.
            </p>
          </div>

          {/* Cartes statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <div className="text-xs text-slate-400 font-semibold">Boîtes actives</div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">1</div>
              <div className="text-[10px] text-emerald-500 font-semibold mt-1">contact@oussamma.tn</div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <div className="text-xs text-slate-400 font-semibold">Domaines gérés</div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">1</div>
              <div className="text-[10px] text-blue-600 font-semibold mt-1">oussamma.tn (Vérifié)</div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <div className="text-xs text-slate-400 font-semibold">Taux de délivrabilité</div>
              <div className="text-2xl font-extrabold text-emerald-600 mt-1">100%</div>
              <div className="text-[10px] text-slate-400 mt-1">0 rebond détecté</div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <div className="text-xs text-slate-400 font-semibold">Applications M2M</div>
              <div className="text-2xl font-extrabold text-indigo-600 mt-1">1</div>
              <div className="text-[10px] text-slate-400 mt-1">Portail oussamma.tn</div>
            </div>
          </div>

          {/* Validation DNS */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  État DNS & Délivrabilité (oussamma.tn)
                </h3>
                <p className="text-xs text-slate-500">
                  Contrôle des signatures cryptographiques et de l’anti-usurpation.
                </p>
              </div>
              <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-200">
                Conforme
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">Enregistrement MX</span>
                  <p className="text-slate-400 text-[11px]">10 mail.oussamma.tn</p>
                </div>
                <span className="text-emerald-500 font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  Actif
                </span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">SPF (Sender Policy Framework)</span>
                  <p className="text-slate-400 text-[11px]">v=spf1 mx a:mail.oussamma.tn -all</p>
                </div>
                <span className="text-emerald-500 font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  Valide
                </span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">DKIM (DomainKeys Identified Mail)</span>
                  <p className="text-slate-400 text-[11px]">mail._domainkey.oussamma.tn (Clé 2048-bit)</p>
                </div>
                <span className="text-emerald-500 font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  Valide
                </span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">DMARC</span>
                  <p className="text-slate-400 text-[11px]">v=DMARC1; p=quarantine; rua=mailto:dmarc@oussamma.tn</p>
                </div>
                <span className="text-emerald-500 font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  Valide
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL DE COMPOSITION ===================== */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Nouveau Message
              </span>
              <button
                onClick={() => setIsComposeOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <input
                  type="email"
                  placeholder="Destinataire (ex: contact@oussamma.tn)"
                  value={composeTo}
                  onChange={e => setComposeTo(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Objet du message"
                  value={composeSubject}
                  onChange={e => setComposeSubject(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <textarea
                  rows={8}
                  placeholder="Rédigez votre email ici..."
                  value={composeBody}
                  onChange={e => setComposeBody(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-blue-500 resize-none font-sans"
                />
              </div>

              {isDriveAttached && (
                <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-semibold">
                  <span className="material-symbols-outlined text-sm">cloud_done</span>
                  <span>Fichier attaché depuis ByteVault Drive (partage sécurisé)</span>
                  <button
                    onClick={() => setIsDriveAttached(false)}
                    className="ml-auto text-blue-500 hover:text-blue-700"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsDriveAttached(true)}
                  className="flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-blue-600 text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  title="Sélectionner depuis ByteVault Drive"
                >
                  <span className="material-symbols-outlined text-sm text-blue-600">cloud</span>
                  <span>Drive</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsComposeOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 font-semibold"
                >
                  Annuler
                </button>

                <button
                  type="button"
                  onClick={handleSendEmail}
                  disabled={isSending || !composeTo || !composeSubject}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl disabled:opacity-50 transition-all shadow-xs"
                >
                  {isSending ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-sm">
                        progress_activity
                      </span>
                      <span>Envoi...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">send</span>
                      <span>Envoyer</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
