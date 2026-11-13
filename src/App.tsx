
import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen, Search, Plus, Library, Inbox, Settings, Download, Upload,
  Moon, Sun, Trash2, Pencil, X, Lightbulb, CircleHelp,
  MessageSquareQuote, GraduationCap, Cloud, CloudOff, LogIn,
  LogOut, RefreshCw, Menu
} from 'lucide-react';

import type { EntryType, JournalData, JournalEntry, Source } from './types';
import {
  deleteEntry, deleteSource, getAllData, replaceAllData,
  saveEntry, saveSource
} from './lib/db';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import { pullCloudData, pushCloudData } from './lib/cloud';

const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();

const emptyData: JournalData = { sources: [], entries: [] };

const typeLabels: Record<EntryType, string> = {
  insight: 'Ý tưởng',
  question: 'Câu hỏi',
  critique: 'Phản biện',
  lesson: 'Bài học'
};

const typeIcons = {
  insight: Lightbulb,
  question: CircleHelp,
  critique: MessageSquareQuote,
  lesson: GraduationCap
};

const statusLabels = {
  reading: 'Đang đọc',
  finished: 'Đã đọc',
  paused: 'Tạm dừng',
  'want-to-read': 'Muốn đọc'
};

const kindLabels = {
  book: 'Sách',
  article: 'Bài viết',
  video: 'Video',
  course: 'Khóa học',
  other: 'Khác'
};

type View = 'home' | 'library' | 'inbox' | 'settings';

function App() {
  const [data, setData] = useState<JournalData>(emptyData);
  const [view, setView] = useState<View>('home');
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState<EntryType | 'all'>('all');

  const [modal, setModal] = useState<'entry' | 'source' | null>(null);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [editingSource, setEditingSource] = useState<Source | null>(null);

  const [dark, setDark] = useState(localStorage.getItem('rj-dark') === 'true');
  const [notice, setNotice] = useState('');

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Trạng thái đăng nhập và bảo mật
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  // Trạng thái đổi mật khẩu
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [mobileMenu, setMobileMenu] = useState(false);

  // Đọc dữ liệu trên thiết bị
  useEffect(() => {
    getAllData()
      .then(setData)
      .catch(() => setNotice('Không thể đọc dữ liệu trên thiết bị.'));
  }, []);

  // Chế độ sáng / tối
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    localStorage.setItem('rj-dark', String(dark));
  }, [dark]);

  // Theo dõi trạng thái đăng nhập Supabase
  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data: sessionData }) => {
      setUserEmail(sessionData.session?.user.email ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUserEmail(session?.user.email ?? null);

        // Người dùng mở liên kết khôi phục mật khẩu
        if (event === 'PASSWORD_RECOVERY') {
          setShowChangePassword(true);
          setNotice('Vui lòng nhập mật khẩu mới.');
        }

        if (event === 'SIGNED_OUT') {
          setShowChangePassword(false);
          setNewPassword('');
          setConfirmPassword('');
          setLoginPassword('');
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  // Tự động ẩn thông báo
  useEffect(() => {
    if (!notice) return;

    const timer = window.setTimeout(() => setNotice(''), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  // Lọc ghi chú
  const filteredEntries = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('vi');

    return [...data.entries]
      .filter((entry) => {
        const source = data.sources.find(
          (item) => item.id === entry.sourceId
        );

        const text = `${entry.title} ${entry.content} ${entry.tags.join(' ')} ${source?.title ?? ''}`
          .toLocaleLowerCase('vi');

        return (
          (!normalized || text.includes(normalized)) &&
          (selectedType === 'all' || entry.type === selectedType)
        );
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [data, query, selectedType]);

  async function refresh() {
    setData(await getAllData());
  }

  async function handleSaveEntry(entry: JournalEntry) {
    await saveEntry(entry);
    await refresh();
    setModal(null);
    setEditingEntry(null);
    setNotice('Đã lưu ghi chú.');
  }

  async function handleSaveSource(source: Source) {
    await saveSource(source);
    await refresh();
    setModal(null);
    setEditingSource(null);
    setNotice('Đã lưu tài liệu.');
  }

  async function removeEntry(entryId: string) {
    if (!window.confirm('Bạn muốn xóa ghi chú này?')) return;

    await deleteEntry(entryId);
    await refresh();
    setNotice('Đã xóa ghi chú.');
  }

  async function removeSource(sourceId: string) {
    if (!window.confirm('Xóa tài liệu này cũng sẽ xóa các ghi chú liên quan. Tiếp tục?')) return;

    await deleteSource(sourceId);
    await refresh();
    setNotice('Đã xóa tài liệu và ghi chú liên quan.');
  }

  // Xuất dữ liệu
  function exportData() {
    const blob = new Blob(
      [JSON.stringify({
        ...data,
        exportedAt: now(),
        app: 'Reading Journal'
      }, null, 2)],
      { type: 'application/json' }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = `reading-journal-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();

    URL.revokeObjectURL(url);
    setNotice('Đã xuất dữ liệu JSON.');
  }

  // Nhập dữ liệu
  async function importData(file?: File) {
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text()) as JournalData;

      if (!Array.isArray(parsed.sources) || !Array.isArray(parsed.entries)) {
        throw new Error('Sai định dạng');
      }

      if (!window.confirm('Nhập dữ liệu sẽ thay thế dữ liệu hiện có trên thiết bị. Bạn đã sao lưu chưa?')) {
        return;
      }

      await replaceAllData({
        sources: parsed.sources,
        entries: parsed.entries
      });

      await refresh();
      setNotice('Đã nhập dữ liệu.');
    } catch {
      setNotice('Không thể nhập file. Hãy chọn file JSON được xuất từ Reading Journal.');
    }
  }

  // ĐỔI MẬT KHẨU HOẶC ĐẶT LẠI MẬT KHẨU
  async function setPassword() {
    if (!supabase) {
      setNotice('Chưa kết nối Supabase.');
      return;
    }

    if (newPassword.length < 8) {
      setNotice('Mật khẩu cần có ít nhất 8 ký tự.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setNotice('Hai mật khẩu không trùng khớp.');
      return;
    }

    setAuthBusy(true);

    try {
      const { data: authData, error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        setNotice(`Không thể cập nhật mật khẩu: ${error.message}`);
        return;
      }

      if (!authData.user) {
        setNotice('Không xác nhận được tài khoản. Vui lòng đăng nhập lại.');
        return;
      }

      setNewPassword('');
      setConfirmPassword('');
      setShowChangePassword(false);
      setNotice('Đã cập nhật mật khẩu thành công!');
    } catch {
      setNotice('Có lỗi xảy ra khi cập nhật mật khẩu.');
    } finally {
      setAuthBusy(false);
    }
  }

  // ĐĂNG NHẬP BẰNG MAGIC LINK
  async function signIn() {
    if (!supabase) {
      setNotice('Chưa kết nối Supabase.');
      return;
    }

    if (!loginEmail.trim()) {
      setNotice('Vui lòng nhập email.');
      return;
    }

    setAuthBusy(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: loginEmail.trim(),
        options: {
          emailRedirectTo: window.location.origin
        }
      });

      setNotice(
        error
          ? `Lỗi đăng nhập: ${error.message}`
          : 'Đã gửi liên kết đăng nhập vào email. Hãy kiểm tra hộp thư.'
      );
    } catch {
      setNotice('Có lỗi xảy ra khi gửi Magic Link.');
    } finally {
      setAuthBusy(false);
    }
  }

  // ĐĂNG NHẬP BẰNG EMAIL VÀ MẬT KHẨU
  async function signInWithPassword() {
    if (!supabase) {
      setNotice('Chưa kết nối Supabase.');
      return;
    }

    if (!loginEmail.trim() || !loginPassword) {
      setNotice('Vui lòng nhập email và mật khẩu.');
      return;
    }

    setAuthBusy(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword
      });

      if (error) {
        setNotice(`Đăng nhập thất bại: ${error.message}`);
        return;
      }

      setLoginPassword('');
      setNotice('Đăng nhập thành công!');
    } catch {
      setNotice('Có lỗi xảy ra khi đăng nhập.');
    } finally {
      setAuthBusy(false);
    }
  }

  // QUÊN MẬT KHẨU
  async function resetPassword() {
    if (!supabase) {
      setNotice('Chưa kết nối Supabase.');
      return;
    }

    if (!loginEmail.trim()) {
      setNotice('Vui lòng nhập email trước.');
      return;
    }

    setAuthBusy(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        loginEmail.trim(),
        {
          redirectTo: window.location.origin
        }
      );

      setNotice(
        error
          ? `Không thể gửi email: ${error.message}`
          : 'Đã gửi liên kết đặt lại mật khẩu. Hãy kiểm tra email.'
      );
    } catch {
      setNotice('Có lỗi xảy ra khi gửi email đặt lại mật khẩu.');
    } finally {
      setAuthBusy(false);
    }
  }

  // ĐĂNG XUẤT
  async function signOut() {
    if (!supabase) return;

    const { error } = await supabase.auth.signOut();

    if (error) {
      setNotice(`Lỗi đăng xuất: ${error.message}`);
      return;
    }

    setUserEmail(null);
    setNewPassword('');
    setConfirmPassword('');
    setLoginPassword('');
    setShowChangePassword(false);
    setNotice('Đã đăng xuất Supabase.');
  }

  // ĐỒNG BỘ CLOUD
  async function syncCloud() {
    if (!supabase) return;

    setSyncing(true);

    try {
      const { data: auth } = await supabase.auth.getUser();

      if (!auth.user) {
        setNotice('Bạn cần đăng nhập trước khi đồng bộ.');
        return;
      }

      const cloudData = await pullCloudData(auth.user.id);

      const localIds = new Set(data.sources.map((x) => x.id));
      const localEntryIds = new Set(data.entries.map((x) => x.id));

      const merged: JournalData = {
        sources: [
          ...cloudData.sources.filter((x) => !localIds.has(x.id)),
          ...data.sources
        ],
        entries: [
          ...cloudData.entries.filter((x) => !localEntryIds.has(x.id)),
          ...data.entries
        ]
      };

      await pushCloudData(auth.user.id, merged);
      await replaceAllData(merged);
      await refresh();

      setNotice('Đồng bộ hoàn tất.');
    } catch (error) {
      setNotice(
        `Đồng bộ chưa thành công: ${
          error instanceof Error ? error.message : 'Lỗi không xác định'
        }`
      );
    } finally {
      setSyncing(false);
    }
  }

  const navItems = [
    { key: 'home' as const, label: 'Tổng quan', icon: BookOpen },
    { key: 'library' as const, label: 'Thư viện', icon: Library },
    { key: 'inbox' as const, label: 'Ghi chú', icon: Inbox },
    { key: 'settings' as const, label: 'Cài đặt', icon: Settings }
  ];

  const openNewEntry = () => {
    setEditingEntry(null);
    setModal('entry');
  };

  const openNewSource = () => {
    setEditingSource(null);
    setModal('source');
  };

  return (
    <div className="app-shell">

      {/* SIDEBAR */}
      <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">
            <BookOpen size={21} />
          </div>

          <div>
            <strong>Reading Journal</strong>
            <span>Đọc để hiểu, viết để nhớ</span>
          </div>

          <button
            className="icon-btn mobile-close"
            onClick={() => setMobileMenu(false)}
            aria-label="Đóng menu"
          >
            <X size={18} />
          </button>
        </div>

        <button className="primary-btn new-note" onClick={openNewEntry}>
          <Plus size={17} /> Ghi chú mới
        </button>

        <div className="nav-caption">KHÔNG GIAN CỦA BẠN</div>

        <nav>
          {navItems.map(item => (
            <button
              key={item.key}
              className={`nav-item ${view === item.key ? 'active' : ''}`}
              onClick={() => {
                setView(item.key);
                setMobileMenu(false);
              }}
            >
              <item.icon size={18} />
              {item.label}

              {item.key === 'inbox' && data.entries.length > 0 && (
                <span className="nav-count">{data.entries.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="quote-card">
            <span className="quote-mark">“</span>
            <p>Một ý tưởng được viết xuống là một ý tưởng có cơ hội lớn lên.</p>
          </div>

          <div className="local-status">
            <span className="status-dot" /> Dữ liệu đang lưu trên thiết bị
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="main-area">

        <header className="topbar">
          <button
            className="icon-btn menu-toggle"
            onClick={() => setMobileMenu(true)}
            aria-label="Mở menu"
          >
            <Menu size={20} />
          </button>

          <div className="breadcrumb">
            Không gian cá nhân <span>/</span>
            <b>{navItems.find(x => x.key === view)?.label}</b>
          </div>

          <div className="top-actions">
            <label className="search-box">
              <Search size={17} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Tìm ghi chú, sách, ý tưởng..."
              />
              <kbd>⌘ K</kbd>
            </label>

            <button
              className="icon-btn"
              onClick={() => setDark(!dark)}
              title="Đổi giao diện"
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div className="avatar">RJ</div>
          </div>
        </header>

        <div className="page-content">

          {/* TỔNG QUAN */}
          {view === 'home' && (
            <>
              <section className="welcome-row">
                <div>
                  <div className="eyebrow">THỨ GÌ ĐÓ ĐÁNG ĐƯỢC GHI LẠI</div>
                  <h1>Chào mừng trở lại<span className="period">.</span></h1>
                  <p className="subheading">
                    Mỗi trang sách mở ra một thế giới. Mỗi ghi chú giữ lại một phần thế giới ấy.
                  </p>
                </div>

                <button className="primary-btn" onClick={openNewEntry}>
                  <Plus size={17} /> Viết ghi chú
                </button>
              </section>

              <section className="stats-grid">
                <StatCard
                  label="Tài liệu đã lưu"
                  value={data.sources.length}
                  detail="Trong thư viện"
                  icon={<Library size={18} />}
                />

                <StatCard
                  label="Ghi chú của bạn"
                  value={data.entries.length}
                  detail="Ý tưởng đã ghi lại"
                  icon={<Inbox size={18} />}
                />

                <StatCard
                  label="Đang đọc"
                  value={data.sources.filter(x => x.status === 'reading').length}
                  detail="Tiếp tục hành trình"
                  icon={<BookOpen size={18} />}
                />
              </section>

              <section className="content-section">
                <div className="section-heading">
                  <div>
                    <h2>Ghi chú gần đây</h2>
                    <p>Những điều bạn vừa khám phá</p>
                  </div>

                  <button className="text-btn" onClick={() => setView('inbox')}>
                    Xem tất cả <span>→</span>
                  </button>
                </div>

                {filteredEntries.length ? (
                  <div className="entry-grid">
                    {filteredEntries.slice(0, 4).map(entry => (
                      <EntryCard
                        key={entry.id}
                        entry={entry}
                        source={data.sources.find(x => x.id === entry.sourceId)}
                        onEdit={() => {
                          setEditingEntry(entry);
                          setModal('entry');
                        }}
                        onDelete={() => removeEntry(entry.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="Chưa có ghi chú nào"
                    text="Hãy bắt đầu bằng một ý tưởng, một câu hỏi hoặc điều khiến bạn suy ngẫm."
                    action="Tạo ghi chú đầu tiên"
                    onClick={openNewEntry}
                  />
                )}
              </section>

              <section className="content-section">
                <div className="section-heading">
                  <div>
                    <h2>Đang đọc</h2>
                    <p>Các tài liệu bạn đang theo đuổi</p>
                  </div>

                  <button className="text-btn" onClick={() => setView('library')}>
                    Mở thư viện <span>→</span>
                  </button>
                </div>

                {data.sources.filter(x => x.status === 'reading').length ? (
                  <div className="source-strip">
                    {data.sources
                      .filter(x => x.status === 'reading')
                      .slice(0, 3)
                      .map(source => (
                        <SourceMini
                          key={source.id}
                          source={source}
                          onEdit={() => {
                            setEditingSource(source);
                            setModal('source');
                          }}
                        />
                      ))}
                  </div>
                ) : (
                  <div className="soft-empty">
                    <BookOpen size={20} />
                    <span>Chưa có tài liệu nào đang đọc.</span>
                    <button className="text-btn" onClick={openNewSource}>
                      Thêm tài liệu +
                    </button>
                  </div>
                )}
              </section>
            </>
          )}

          {/* THƯ VIỆN */}
          {view === 'library' && (
            <>
              <PageIntro
                eyebrow="KHO TRI THỨC CÁ NHÂN"
                title="Thư viện"
                text="Quản lý những cuốn sách, bài viết và tài liệu đồng hành cùng bạn."
                action={
                  <button className="primary-btn" onClick={openNewSource}>
                    <Plus size={17} /> Thêm tài liệu
                  </button>
                }
              />

              <div className="filter-row">
                <span>{data.sources.length} tài liệu</span>
                <span className="muted">Chọn một tài liệu để chỉnh sửa thông tin</span>
              </div>

              {data.sources.length ? (
                <div className="source-grid">
                  {data.sources
                    .filter(s =>
                      !query ||
                      `${s.title} ${s.author}`.toLowerCase().includes(query.toLowerCase())
                    )
                    .map(source => (
                      <SourceCard
                        key={source.id}
                        source={source}
                        count={data.entries.filter(e => e.sourceId === source.id).length}
                        onEdit={() => {
                          setEditingSource(source);
                          setModal('source');
                        }}
                        onDelete={() => removeSource(source.id)}
                      />
                    ))}
                </div>
              ) : (
                <EmptyState
                  title="Thư viện còn trống"
                  text="Thêm cuốn sách hoặc tài liệu đầu tiên để bắt đầu xây dựng kho tri thức."
                  action="Thêm tài liệu"
                  onClick={openNewSource}
                />
              )}
            </>
          )}

          {/* GHI CHÚ */}
          {view === 'inbox' && (
            <>
              <PageIntro
                eyebrow="DÒNG SUY NGHĨ CỦA BẠN"
                title="Tất cả ghi chú"
                text="Một nơi để gom lại những ý tưởng không muốn đánh rơi."
                action={
                  <button className="primary-btn" onClick={openNewEntry}>
                    <Plus size={17} /> Ghi chú mới
                  </button>
                }
              />

              <div className="type-filters">
                <button
                  className={selectedType === 'all' ? 'selected' : ''}
                  onClick={() => setSelectedType('all')}
                >
                  Tất cả
                </button>

                {(Object.keys(typeLabels) as EntryType[]).map(t => (
                  <button
                    key={t}
                    className={selectedType === t ? 'selected' : ''}
                    onClick={() => setSelectedType(t)}
                  >
                    {typeLabels[t]}
                  </button>
                ))}
              </div>

              {filteredEntries.length ? (
                <div className="entry-list">
                  {filteredEntries.map(entry => (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      source={data.sources.find(x => x.id === entry.sourceId)}
                      onEdit={() => {
                        setEditingEntry(entry);
                        setModal('entry');
                      }}
                      onDelete={() => removeEntry(entry.id)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Không tìm thấy ghi chú"
                  text="Thử đổi từ khóa tìm kiếm hoặc tạo một ghi chú mới."
                  action="Tạo ghi chú"
                  onClick={openNewEntry}
                />
              )}
            </>
          )}

          {/* CÀI ĐẶT */}
          {view === 'settings' && (
            <>
              <PageIntro
                eyebrow="TÙY CHỈNH KHÔNG GIAN"
                title="Cài đặt"
                text="Quản lý dữ liệu, giao diện và kết nối tài khoản của bạn."
              />

              <div className="settings-layout">

                {/* SAO LƯU */}
                <section className="settings-card">
                  <div className="settings-title">
                    <div className="settings-icon">
                      <Download size={18} />
                    </div>

                    <div>
                      <h3>Sao lưu dữ liệu</h3>
                      <p>Xuất hoặc nhập dữ liệu Reading Journal dưới dạng JSON.</p>
                    </div>
                  </div>

                  <div className="settings-actions">
                    <button className="secondary-btn" onClick={exportData}>
                      <Download size={16} /> Xuất dữ liệu
                    </button>

                    <label className="secondary-btn file-label">
                      <Upload size={16} /> Nhập dữ liệu
                      <input
                        type="file"
                        accept="application/json,.json"
                        onChange={e => importData(e.target.files?.[0])}
                      />
                    </label>
                  </div>
                </section>

                {/* SUPABASE VÀ TÀI KHOẢN */}
                <section className="settings-card">
                  <div className="settings-title">
                    <div className="settings-icon">
                      <Cloud size={18} />
                    </div>

                    <div>
                      <h3>Đồng bộ Supabase</h3>
                      <p>
                        {isSupabaseConfigured
                          ? 'Kết nối cơ sở dữ liệu đám mây và đăng nhập bằng email.'
                          : 'Chưa cấu hình. Bạn sẽ kết nối sau khi tạo dự án Supabase.'}
                      </p>
                    </div>
                  </div>

                  {isSupabaseConfigured ? (
                    <>
                      {/* ĐÃ ĐĂNG NHẬP */}
                      {userEmail ? (
                        <>
                          <div className="account-line">
                            <span className="connected-dot" />
                            Đang đăng nhập: <b>{userEmail}</b>
                          </div>

                          <div className="settings-actions">
                            <button
                              className="secondary-btn"
                              onClick={() => {
                                setShowChangePassword(!showChangePassword);
                                setNewPassword('');
                                setConfirmPassword('');
                              }}
                            >
                              <Pencil size={16} />
                              {showChangePassword ? 'Hủy đổi mật khẩu' : 'Đổi mật khẩu'}
                            </button>

                            <button
                              className="secondary-btn"
                              onClick={syncCloud}
                              disabled={syncing}
                            >
                              <RefreshCw
                                size={16}
                                className={syncing ? 'spin' : ''}
                              />
                              {syncing ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}
                            </button>

                            <button
                              className="secondary-btn"
                              onClick={signOut}
                            >
                              <LogOut size={16} /> Đăng xuất
                            </button>
                          </div>

                          {/* FORM ĐỔI MẬT KHẨU */}
                          {showChangePassword && (
                            <div className="form-stack" style={{ marginTop: 16 }}>
                              <h4>Đổi mật khẩu</h4>

                              <label className="field-label">
                                Mật khẩu mới
                                <input
                                  type="password"
                                  value={newPassword}
                                  onChange={e => setNewPassword(e.target.value)}
                                  placeholder="Ít nhất 8 ký tự"
                                  autoComplete="new-password"
                                  minLength={8}
                                />
                              </label>

                              <label className="field-label">
                                Xác nhận mật khẩu mới
                                <input
                                  type="password"
                                  value={confirmPassword}
                                  onChange={e => setConfirmPassword(e.target.value)}
                                  placeholder="Nhập lại mật khẩu mới"
                                  autoComplete="new-password"
                                />
                              </label>

                              <button
                                className="primary-btn"
                                onClick={setPassword}
                                disabled={
                                  authBusy ||
                                  !newPassword ||
                                  !confirmPassword
                                }
                              >
                                {authBusy ? 'Đang cập nhật...' : 'Lưu mật khẩu mới'}
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        /* CHƯA ĐĂNG NHẬP */
                        <>
                          <div className="account-line">
                            <span className="status-dot" />
                            Chưa đăng nhập
                          </div>

                          <div className="form-stack" style={{ marginTop: 16 }}>
                            <h4>Đăng nhập tài khoản</h4>

                            <label className="field-label">
                              Email
                              <input
                                type="email"
                                value={loginEmail}
                                onChange={e => setLoginEmail(e.target.value)}
                                placeholder="Nhập email của bạn"
                                autoComplete="email"
                                required
                              />
                            </label>

                            <label className="field-label">
                              Mật khẩu
                              <input
                                type="password"
                                value={loginPassword}
                                onChange={e => setLoginPassword(e.target.value)}
                                placeholder="Nhập mật khẩu"
                                autoComplete="current-password"
                                required
                              />
                            </label>

                            <button
                              className="primary-btn"
                              onClick={signInWithPassword}
                              disabled={
                                authBusy ||
                                !loginEmail.trim() ||
                                !loginPassword
                              }
                            >
                              <LogIn size={16} />
                              {authBusy ? 'Đang đăng nhập...' : 'Đăng nhập'}
                            </button>

                            <button
                              type="button"
                              className="text-btn"
                              onClick={resetPassword}
                              disabled={authBusy || !loginEmail.trim()}
                            >
                              Quên mật khẩu?
                            </button>

                            <div className="fine-print">
                              Hoặc đăng nhập bằng liên kết gửi đến email.
                            </div>

                            <button
                              className="secondary-btn"
                              onClick={signIn}
                              disabled={authBusy || !loginEmail.trim()}
                            >
                              <LogIn size={16} />
                              Đăng nhập bằng Magic Link
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="setup-hint">
                      <CloudOff size={16} />
                      Làm theo hướng dẫn trong README.md để cấu hình file .env.
                    </div>
                  )}
                </section>

                {/* GIAO DIỆN */}
                <section className="settings-card">
                  <div className="settings-title">
                    <div className="settings-icon">
                      <Moon size={18} />
                    </div>

                    <div>
                      <h3>Giao diện</h3>
                      <p>Chọn giao diện phù hợp với mắt của bạn.</p>
                    </div>
                  </div>

                  <button
                    className="secondary-btn"
                    onClick={() => setDark(!dark)}
                  >
                    {dark ? <Sun size={16} /> : <Moon size={16} />}
                    {dark ? 'Chuyển sang sáng' : 'Chuyển sang tối'}
                  </button>
                </section>

                {/* THÔNG TIN ỨNG DỤNG */}
                <section className="settings-card">
                  <div className="settings-title">
                    <div className="settings-icon">
                      <BookOpen size={18} />
                    </div>

                    <div>
                      <h3>Về Reading Journal</h3>
                      <p>Phiên bản MVP 1.1 · Lưu trữ local-first · React + TypeScript</p>
                    </div>
                  </div>

                  <p className="fine-print">
                    Dữ liệu được lưu trong trình duyệt trên thiết bị này.
                    Hãy xuất bản sao lưu định kỳ. Khi bật Supabase, dữ liệu
                    sẽ được đồng bộ với tài khoản đã đăng nhập.
                  </p>
                </section>

              </div>
            </>
          )}
        </div>
      </main>

      {/* MENU MOBILE */}
      {mobileMenu && (
        <button
          className="scrim"
          onClick={() => setMobileMenu(false)}
          aria-label="Đóng menu"
        />
      )}

      {/* THÔNG BÁO */}
      {notice && <div className="toast">{notice}</div>}

      {/* MODAL GHI CHÚ */}
      {modal === 'entry' && (
        <EntryModal
          entry={editingEntry}
          sources={data.sources}
          onClose={() => {
            setModal(null);
            setEditingEntry(null);
          }}
          onSave={handleSaveEntry}
        />
      )}

      {/* MODAL TÀI LIỆU */}
      {modal === 'source' && (
        <SourceModal
          source={editingSource}
          onClose={() => {
            setModal(null);
            setEditingSource(null);
          }}
          onSave={handleSaveSource}
        />
      )}
    </div>
  );
}

// THẺ THỐNG KÊ
function StatCard({
  label, value, detail, icon
}: {
  label: string;
  value: number;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <span className="stat-icon">{icon}</span>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-detail">{detail}</div>
    </div>
  );
}

// TIÊU ĐỀ TRANG
function PageIntro({
  eyebrow, title, text, action
}: {
  eyebrow: string;
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="page-intro">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}<span className="period">.</span></h1>
        <p className="subheading">{text}</p>
      </div>
      {action}
    </section>
  );
}

// TRẠNG THÁI TRỐNG
function EmptyState({
  title, text, action, onClick
}: {
  title: string;
  text: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <div className="empty-state">
      <div className="empty-illustration">
        <BookOpen size={27} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      <button className="secondary-btn" onClick={onClick}>
        <Plus size={16} />{action}
      </button>
    </div>
  );
}

// THẺ GHI CHÚ
function EntryCard({
  entry, source, onEdit, onDelete
}: {
  entry: JournalEntry;
  source?: Source;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const Icon = typeIcons[entry.type];

  return (
    <article className="entry-card">
      <div className="entry-card-top">
        <span className={`type-chip type-${entry.type}`}>
          <Icon size={14} />{typeLabels[entry.type]}
        </span>

        <div className="card-actions">
          <button className="tiny-icon" onClick={onEdit} title="Chỉnh sửa">
            <Pencil size={14} />
          </button>

          <button className="tiny-icon danger" onClick={onDelete} title="Xóa">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <h3>{entry.title || 'Ghi chú chưa có tiêu đề'}</h3>
      <p className="entry-excerpt">{entry.content || 'Chưa có nội dung.'}</p>

      {entry.tags.length > 0 && (
        <div className="tag-row">
          {entry.tags.slice(0, 3).map(tag => (
            <span key={tag}>#{tag}</span>
          ))}
        </div>
      )}

      <div className="entry-meta">
        <span>{source?.title ?? 'Ghi chú tự do'}</span>
        <span>{new Date(entry.updatedAt).toLocaleDateString('vi-VN')}</span>
      </div>
    </article>
  );
}

// TÀI LIỆU ĐANG ĐỌC
function SourceMini({
  source, onEdit
}: {
  source: Source;
  onEdit: () => void;
}) {
  return (
    <button className="source-mini" onClick={onEdit}>
      <div className="book-cover">
        <BookOpen size={20} />
      </div>

      <div>
        <strong>{source.title}</strong>
        <span>
          {source.author || kindLabels[source.kind]} · {statusLabels[source.status]}
        </span>
      </div>
    </button>
  );
}

// THẺ TÀI LIỆU
function SourceCard({
  source, count, onEdit, onDelete
}: {
  source: Source;
  count: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="source-card">
      <div className="source-card-head">
        <div className="book-cover large">
          <BookOpen size={23} />
        </div>

        <div className="card-actions">
          <button className="tiny-icon" onClick={onEdit} title="Chỉnh sửa">
            <Pencil size={14} />
          </button>

          <button className="tiny-icon danger" onClick={onDelete} title="Xóa">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="source-kind">{kindLabels[source.kind]}</div>
      <h3>{source.title}</h3>
      <p>{source.author || 'Chưa có tên tác giả'}</p>

      <div className="source-card-foot">
        <span className={`status-pill status-${source.status}`}>
          {statusLabels[source.status]}
        </span>
        <span>{count} ghi chú</span>
      </div>
    </article>
  );
}

// MODAL GHI CHÚ
function EntryModal({
  entry, sources, onClose, onSave
}: {
  entry: JournalEntry | null;
  sources: Source[];
  onClose: () => void;
  onSave: (entry: JournalEntry) => void;
}) {
  const [title, setTitle] = useState(entry?.title ?? '');
  const [content, setContent] = useState(entry?.content ?? '');
  const [type, setType] = useState<EntryType>(entry?.type ?? 'insight');
  const [sourceId, setSourceId] = useState(entry?.sourceId ?? '');
  const [tags, setTags] = useState(entry?.tags.join(', ') ?? '');

  const prompts: Record<EntryType, string> = {
    insight: 'Điều gì khiến mình chú ý? Vì sao ý tưởng này quan trọng?',
    question: 'Mình còn thắc mắc điều gì? Cần tìm hiểu thêm điều gì?',
    critique: 'Mình đồng ý hay chưa đồng ý ở điểm nào? Lý do là gì?',
    lesson: 'Mình học được điều gì và có thể áp dụng ra sao?'
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();

    const stamp = now();

    onSave({
      id: entry?.id ?? id(),
      title: title.trim(),
      content: content.trim(),
      type,
      sourceId: sourceId || null,
      tags: tags.split(',').map(x => x.trim()).filter(Boolean),
      createdAt: entry?.createdAt ?? stamp,
      updatedAt: stamp
    });
  }

  return (
    <Modal
      title={entry ? 'Chỉnh sửa ghi chú' : 'Ghi lại một suy nghĩ'}
      subtitle="Đừng để những ý tưởng hay trôi qua."
      onClose={onClose}
    >
      <form onSubmit={submit} className="form-stack">

        <label className="field-label">
          Tiêu đề
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Điều gì đang ở trong tâm trí bạn?"
          />
        </label>

        <label className="field-label">
          Loại ghi chú

          <div className="type-select-grid">
            {(Object.keys(typeLabels) as EntryType[]).map(t => {
              const Icon = typeIcons[t];

              return (
                <button
                  type="button"
                  key={t}
                  className={type === t ? 'type-option chosen' : 'type-option'}
                  onClick={() => setType(t)}
                >
                  <Icon size={16} />{typeLabels[t]}
                </button>
              );
            })}
          </div>
        </label>

        <div className="prompt-hint">
          Gợi ý: {prompts[type]}
        </div>

        <label className="field-label">
          Nội dung
          <textarea
            rows={7}
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Viết tự do tại đây..."
          />
        </label>

        <label className="field-label">
          Liên kết tài liệu
          <select
            value={sourceId}
            onChange={e => setSourceId(e.target.value)}
          >
            <option value="">Ghi chú tự do, không gắn tài liệu</option>
            {sources.map(s => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </label>

        <label className="field-label">
          Thẻ phân loại
          <input
            value={tags}
            onChange={e => setTags(e.target.value)}
            placeholder="Ví dụ: tư duy, lãnh đạo, đức tin"
          />
          <span className="field-help">
            Phân cách các thẻ bằng dấu phẩy.
          </span>
        </label>

        <div className="modal-footer">
          <button type="button" className="secondary-btn" onClick={onClose}>
            Hủy
          </button>

          <button className="primary-btn" type="submit">
            Lưu ghi chú
          </button>
        </div>
      </form>
    </Modal>
  );
}

// MODAL TÀI LIỆU
function SourceModal({
  source, onClose, onSave
}: {
  source: Source | null;
  onClose: () => void;
  onSave: (source: Source) => void;
}) {
  const [title, setTitle] = useState(source?.title ?? '');
  const [author, setAuthor] = useState(source?.author ?? '');
  const [kind, setKind] = useState<Source['kind']>(source?.kind ?? 'book');
  const [status, setStatus] = useState<Source['status']>(
    source?.status ?? 'want-to-read'
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();

    const stamp = now();

    onSave({
      id: source?.id ?? id(),
      title: title.trim(),
      author: author.trim(),
      kind,
      status,
      createdAt: source?.createdAt ?? stamp,
      updatedAt: stamp
    });
  }

  return (
    <Modal
      title={source ? 'Chỉnh sửa tài liệu' : 'Thêm tài liệu mới'}
      subtitle="Lưu lại nguồn tri thức bạn đang khám phá."
      onClose={onClose}
    >
      <form onSubmit={submit} className="form-stack">

        <label className="field-label">
          Tên tài liệu
          <input
            autoFocus
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Tên sách, bài viết hoặc khóa học"
          />
        </label>

        <label className="field-label">
          Tác giả / Người tạo
          <input
            value={author}
            onChange={e => setAuthor(e.target.value)}
            placeholder="Tên tác giả (không bắt buộc)"
          />
        </label>

        <div className="form-two">
          <label className="field-label">
            Loại tài liệu
            <select
              value={kind}
              onChange={e => setKind(e.target.value as Source['kind'])}
            >
              {Object.entries(kindLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </label>

          <label className="field-label">
            Trạng thái
            <select
              value={status}
              onChange={e => setStatus(e.target.value as Source['status'])}
            >
              {Object.entries(statusLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="modal-footer">
          <button type="button" className="secondary-btn" onClick={onClose}>
            Hủy
          </button>

          <button className="primary-btn" type="submit">
            Lưu tài liệu
          </button>
        </div>
      </form>
    </Modal>
  );
}

// MODAL CHUNG
function Modal({
  title, subtitle, onClose, children
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section className="modal">
        <div className="modal-head">
          <div>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>

          <button
            className="icon-btn"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={19} />
          </button>
        </div>

        {children}
      </section>
    </div>
  );
}

export default App;
