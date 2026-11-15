import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { KeyRound, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { addStudent, changeAdminPin, deleteStudent, fetchStudents, updateStudent } from '../api';
import { translations } from '../i18n';
import type { Language, Student } from '../types';

interface StudentsManagerProps {
  lang: Language;
  pin: string;
  onPinUpdated: (newPin: string) => void;
  onInvalidPin: () => void;
  onShowToast: (message: string) => void;
}

export function StudentsManager({
  lang,
  pin,
  onPinUpdated,
  onInvalidPin,
  onShowToast,
}: StudentsManagerProps) {
  const t = translations[lang];
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [fullName, setFullName] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Change PIN state
  const [newPin, setNewPin] = useState('');
  const [pinMsg, setPinMsg] = useState('');
  const [pinErr, setPinErr] = useState('');
  const [updatingPin, setUpdatingPin] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchStudents(pin);
      setStudents(res.students);
    } catch (err: unknown) {
      if ((err as { status?: number }).status === 401) {
        onInvalidPin();
      }
    } finally {
      setLoading(false);
    }
  }, [pin, onInvalidPin]);

  useEffect(() => {
    void load();
  }, [load]);

  const openAddModal = () => {
    setEditingStudent(null);
    setFullName('');
    setRoomNumber('');
    setMobileNumber('');
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setFullName(student.fullName);
    setRoomNumber(student.roomNumber);
    setMobileNumber(student.mobileNumber);
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = fullName.trim();
    const cleanRoom = roomNumber.trim();
    const cleanMobile = mobileNumber.replace(/\D/g, '').slice(-10);

    if (cleanName.length < 2) {
      setFormError(t.errInvalidName);
      return;
    }
    if (cleanRoom.length < 1) {
      setFormError(t.errInvalidRoom);
      return;
    }
    if (!/^\d{10}$/.test(cleanMobile)) {
      setFormError(t.errInvalidMobile);
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      if (editingStudent) {
        await updateStudent(pin, editingStudent.id, {
          fullName: cleanName,
          roomNumber: cleanRoom,
          mobileNumber: cleanMobile,
        });
        onShowToast(t.toastStudentUpdated);
      } else {
        await addStudent(pin, {
          fullName: cleanName,
          roomNumber: cleanRoom,
          mobileNumber: cleanMobile,
        });
        onShowToast(t.toastStudentAdded);
      }
      setModalOpen(false);
      await load();
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === 'DUPLICATE_MOBILE') {
        setFormError(t.errDuplicateMobile);
      } else {
        setFormError(t.genericError);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteStudent(pin, id);
      setConfirmDeleteId(null);
      onShowToast(t.toastStudentDeleted);
      await load();
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = newPin.replace(/\D/g, '');
    if (!/^\d{4}$/.test(cleanPin)) {
      setPinErr(t.pinPlaceholder);
      return;
    }
    setUpdatingPin(true);
    setPinErr('');
    setPinMsg('');
    try {
      await changeAdminPin(pin, cleanPin);
      onPinUpdated(cleanPin);
      setNewPin('');
      setPinMsg(t.pinUpdatedMsg);
      onShowToast(t.pinUpdatedMsg);
      setTimeout(() => setPinMsg(''), 3000);
    } catch {
      setPinErr(t.genericError);
    } finally {
      setUpdatingPin(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.roomNumber.toLowerCase().includes(q) ||
        s.mobileNumber.includes(q)
    );
  }, [students, search]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-5 pb-24 md:pb-10 space-y-5">
      {/* Header Row */}
      <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-lg sm:text-xl font-bold text-slate-900">
            {t.studentsTitle}
          </h1>
          <p className="text-sm text-slate-600 tabular-nums">
            {students.length} {t.studentsCountLabel}
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="min-h-[48px] px-5 rounded-xl bg-blue-700 hover:bg-blue-800 active:scale-[0.98] text-white font-semibold text-sm inline-flex items-center justify-center gap-2 transition-all whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t.addStudentBtn}</span>
        </button>
      </section>

      {/* Search + Students List */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="p-4 sm:px-5 border-b border-slate-200">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchRosterPlaceholder}
              className="w-full min-h-[44px] pl-10 pr-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-14 bg-slate-100 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-600">{t.noStudentsMatch}</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((student) => {
              const confirmingDelete = confirmDeleteId === student.id;
              return (
                <li
                  key={student.id}
                  className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <p className="font-semibold text-base text-slate-900">{student.fullName}</p>
                    <p className="mt-0.5 text-sm text-slate-600 tabular-nums">
                      <span>
                        {t.roomLabel} {student.roomNumber}
                      </span>
                      <span aria-hidden="true"> · </span>
                      <span>{student.mobileNumber}</span>
                    </p>
                  </div>

                  {confirmingDelete ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-red-700">
                        {t.confirmDeleteMsg}
                      </span>
                      <button
                        type="button"
                        disabled={deletingId === student.id}
                        onClick={() => void handleDelete(student.id)}
                        className="min-h-[40px] px-3 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs font-semibold cursor-pointer"
                      >
                        {t.confirmYesDelete}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="min-h-[40px] px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                      >
                        {t.cancelBtn}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditModal(student)}
                        className="min-h-[42px] px-3.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>{t.editBtn}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(student.id)}
                        aria-label={`${t.deleteBtn} ${student.fullName}`}
                        className="min-h-[42px] px-3.5 rounded-xl border border-slate-300 bg-white hover:border-red-300 hover:bg-red-50 text-xs font-semibold text-red-700 inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{t.deleteBtn}</span>
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Change Admin PIN Card */}
      <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
        <form onSubmit={handleUpdatePin} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <KeyRound className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="text-sm font-semibold text-slate-900">{t.changePinTitle}</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={newPin}
              onChange={(e) => {
                setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                setPinErr('');
              }}
              placeholder={t.newPinPlaceholder}
              className="w-36 min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <button
              type="submit"
              disabled={updatingPin || newPin.length !== 4}
              className="min-h-[44px] px-4 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-500 text-white text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
            >
              {t.updatePinBtn}
            </button>
          </div>
        </form>
        {pinErr && <p className="mt-2 text-xs font-medium text-red-700">{pinErr}</p>}
        {pinMsg && <p className="mt-2 text-xs font-medium text-emerald-700">{pinMsg}</p>}
      </section>

      {/* Add / Edit Student Modal / Bottom Sheet */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 p-5 sm:p-6"
            >
              <div className="w-10 h-1.5 bg-slate-300 rounded-full mx-auto mb-4 sm:hidden" />
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg font-bold text-slate-900">
                  {editingStudent ? t.editStudentTitle : t.addStudentTitle}
                </h2>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  aria-label={t.cancelBtn}
                  className="min-h-[40px] min-w-[40px] rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t.fullNameLabel}
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t.fullNamePlaceholder}
                    className="w-full min-h-[48px] px-3.5 rounded-xl border border-slate-300 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t.roomNumberLabel}
                  </label>
                  <input
                    type="text"
                    required
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    placeholder={t.roomNumberPlaceholder}
                    className="w-full min-h-[48px] px-3.5 rounded-xl border border-slate-300 text-base text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {t.mobileNumberLabel}
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    required
                    maxLength={10}
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder={t.mobileNumberPlaceholder}
                    className="w-full min-h-[48px] px-3.5 rounded-xl border border-slate-300 text-base text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                {formError && (
                  <p className="text-sm font-medium text-red-700" role="alert">
                    {formError}
                  </p>
                )}

                <div className="flex items-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="flex-1 min-h-[48px] rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-700 cursor-pointer"
                  >
                    {t.cancelBtn}
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 min-h-[48px] rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold cursor-pointer disabled:opacity-60"
                  >
                    {saving ? t.savingBtn : t.saveStudentBtn}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
