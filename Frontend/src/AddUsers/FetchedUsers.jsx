// src/components/Users/FetchedUsersInline.jsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  faPenToSquare,
  faTrashCan,
  faPlus,
  faFloppyDisk,
  faXmark,
  faRotateRight,
  faImage,
  faSliders
} from '@fortawesome/free-solid-svg-icons';
import api from '../api/axiosAPI';
import photoAPI from '../api/photoAPI';
import defaultPhoto from '../assets/no-user-image-square.jpg';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import FiltersUsers from './FiltersUsers';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

const ROLE_OPTIONS = ['ofertant', 'angajat', 'beneficiar'];
const LIMBA_OPTIONS = ['RO', 'FR'];

export default function FetchedUsersInline() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // meta lists (frontend only)
  const [meta, setMeta] = useState({ firma: [], departament: [], specializare: [] });
  const [metaOpen, setMetaOpen] = useState(false);
  const [newMeta, setNewMeta] = useState({
    firma: '',
    departament: '',
    specializare: '',
    firmaColor: '#666666',
    departamentColor: '#666666',
    specializareColor: '#666666'
  });

  // filters — text fields + dropdowns (no date filters)
  const [f, setF] = useState({
    limba: '',
    email: '',
    name: '',
    firma: '',            // value = meta name or '' (Toate)
    departament: '',      // value = meta name or ''
    specializare: '',     // value = meta name or ''
    role: 'all',
  });

  // edit/add
  const [editingId, setEditingId] = useState(null);   // number | 'new' | null
  const [rowDraft, setRowDraft] = useState(null);
  const [fileDraft, setFileDraft] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);


  // inside component
  const insertUser = (u) => setUsers(p => [u, ...p]);
  const patchUser = (id, patch) => setUsers(p => p.map(x => x.id === id ? { ...x, ...patch } : x));
  const removeUser = (id) => setUsers(p => p.filter(x => x.id !== id));

  const makeUserFromDraft = (id, d, photo_url = null) => ({
    id,
    limba: d.limba || 'RO',
    email: d.email,
    name: d.name,
    role: d.role || 'angajat',
    telefon_prefix: d.telefon_prefix || '',
    telephone: d.telephone || '',
    telefon_prefix_1: d.telefon_prefix_1 || '',
    telephone_1: d.telephone_1 || '',
    firma_id: d.firma_id || null,
    departament_id: d.departament_id || null,
    specializare_id: d.specializare_id || null,
    data_nastere: d.data_nastere || null,
    created_at: new Date().toISOString(),
    photo_url: photo_url || null,
  });

  // load users
  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users/GetUsers'); // returns all; we filter in UI
      setUsers(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // load meta simple
  const loadMeta = async () => {
    try {
      const [fir, dep, spe] = await Promise.all([
        api.get('/users/options', { params: { type: 'firma' } }),
        api.get('/users/options', { params: { type: 'departament' } }),
        api.get('/users/options', { params: { type: 'specializare' } }),
      ]);
      setMeta({
        firma: (fir.data || []),
        departament: (dep.data || []),
        specializare: (spe.data || []),
      });
    } catch (e) {
      console.error(e);
      setMeta({ firma: [], departament: [], specializare: [] });
    }
  };

  useEffect(() => {
    loadUsers();
    loadMeta();
  }, []);


  const filteredUsers = useMemo(() => {
    const s = (v) => (v || '').toLowerCase();

    const toNum = (v) => {
      if (v === '' || v === null || v === undefined) return null;
      const n = Number(v);
      return Number.isNaN(n) ? null : n;
    };

    const fFirmaId = toNum(f.firma);
    const fDepartamentId = toNum(f.departament);
    const fSpecializareId = toNum(f.specializare);

    return users.filter(u => {
      if (f.limba && s(u.limba) !== s(f.limba)) return false;
      if (f.email && !s(u.email).includes(s(f.email))) return false;
      if (f.name && !s(u.name).includes(s(f.name))) return false;

      if (fFirmaId !== null && Number(u.firma_id) !== fFirmaId) return false;
      if (fDepartamentId !== null && Number(u.departament_id) !== fDepartamentId) return false;
      if (fSpecializareId !== null && Number(u.specializare_id) !== fSpecializareId) return false;

      if (f.role !== 'all' && s(u.role) !== s(f.role)) return false;
      return true;
    });
  }, [users, f]);

  // helpers
  const capitalizeRole = (r) => (r ? r.charAt(0).toUpperCase() + r.slice(1) : '');
  const roleBadge = (r) =>
    r === 'ofertant' ? 'bg-[#2563EB]' : r === 'angajat' ? 'bg-[#16A34A]' : 'bg-[#F97316]';

  const resetDraft = () => {
    setEditingId(null);
    setRowDraft(null);
    setFileDraft(null);
    setConfirmDel(null);
  };

  const startAdd = () => {
    if (editingId) return;
    setEditingId('new');
    setRowDraft({
      limba: 'RO',
      email: '',
      name: '',
      password: '',
      // birou
      telephone: '',
      telefon_prefix: '+40',
      // personal
      telephone_1: '',
      telefon_prefix_1: '+40',

      firma: '',
      departament: '',
      specializare: '',
      firma_id: '',
      departament_id: '',
      specializare_id: '',
      data_nastere: '',
      role: 'angajat',
      photo_url: null,
    });
    setFileDraft(null);
  };

  const startEdit = (u) => {
    if (editingId) return;
    setEditingId(u.id);
    setRowDraft({
      limba: u.limba || 'RO',
      email: u.email || '',
      name: u.name || '',
      password: '',
      telephone: u.telephone || '',
      telefon_prefix: u.telefon_prefix || '+40',
      telephone_1: u.telephone_1 || '',
      telefon_prefix_1: u.telefon_prefix_1 || '+40',
      firma: u.firma || '',
      departament: u.departament || '',
      specializare: u.specializare || '',
      firma_id: u.firma_id ?? (meta.firma.find(m => m.name === u.firma)?.id || ''),
      departament_id: u.departament_id ?? (meta.departament.find(m => m.name === u.departament)?.id || ''),
      specializare_id: u.specializare_id ?? (meta.specializare.find(m => m.name === u.specializare)?.id || ''),
      data_nastere: u.data_nastere ? u.data_nastere.split('T')[0] : '',
      role: u.role || 'angajat',
      photo_url: u.photo_url || null,
    });
    setFileDraft(null);
    setConfirmDel(null);
  };

  const onChangeDraft = (name, value) => {
    if (name === 'name') {
      if (!/^[\p{L}][\p{L}\s-]*$/u.test(value) && value !== '') return;
      if (value.length > 1 && (value.at(-2) === ' ' || value.at(-2) === '-')) {
        value = value.slice(0, -1) + value.at(-1).toUpperCase();
      } else if (value.length === 1) value = value.toUpperCase();
    }
    if (name === 'telephone' || name === 'telephone_1') {
      if (!/^\d*$/.test(value) && value !== '') return;
    }
    if (name === 'telefon_prefix' || name === 'telefon_prefix_1') {
      if (!/^\+?\d*$/.test(value) && value !== '') return;
    }
    setRowDraft((p) => ({ ...p, [name]: value }));
  };

  const onPickFile = (file) => file && setFileDraft(file);

  const saveDraft = async () => {
    if (!rowDraft) return;
    if (!rowDraft.email?.trim() || !rowDraft.name?.trim()) return alert('Email și Nume sunt obligatorii.');
    if (editingId === 'new' && !rowDraft.password?.trim()) return alert('Parola este obligatorie pentru creare.');

    const fd = new FormData();
    ['name', 'email', 'password', 'limba', 'telephone', 'telefon_prefix', 'telephone_1', 'telefon_prefix_1',
      'firma_id', 'departament_id', 'specializare_id', 'data_nastere', 'role'
    ].forEach(k => {
      if (k === 'password' && !rowDraft.password) return;
      fd.append(k, rowDraft[k] ?? '');
    });
    if (fileDraft) {
      fd.append('photo', fileDraft);
    }

    try {
      if (editingId === 'new') {
        const { data } = await api.post('/users/SetUser', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        if (data?.ok && data?.id) {
          insertUser(makeUserFromDraft(data.id, rowDraft, data.photo_url));
          resetDraft();
        } else {
          alert('Salvarea nu a fost confirmată.');
        }
      } else {
        const { data } = await api.post(`/users/UpdateUser/${editingId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        if (data?.ok) {
          patchUser(editingId, makeUserFromDraft(editingId, rowDraft, data.photo_url)); // overwrite with the draft values
          resetDraft();
        } else {
          alert('Actualizarea nu a fost confirmată.');
        }
      }
    } catch (e) {
      console.error(e);
      alert('A apărut o eroare la salvare.');
    }
  };

  const requestDelete = (id) => {
    setConfirmDel((c) => (c === id ? null : id));
    setEditingId(null);
  };

  const doDelete = async (id) => {
    try {
      const { data } = await api.delete(`/users/DeleteUser/${id}`);
      if (data?.ok) {
        removeUser(id);
        setConfirmDel(null);
      } else {
        alert('Ștergerea nu a fost confirmată.');
      }
    } catch (e) {
      console.error(e);
      alert('Nu s-a putut șterge.');
    }
  };
  // meta add
  const addMeta = async (type, name, color_hex = '#666666') => {
    const val = (name || '').trim();
    if (!val) return;
    try {
      await api.post('/users/options', { type, name: val, color_hex });
      await loadMeta();
      setNewMeta((p) => ({ ...p, [type]: '', [`${type}Color`]: '#666666' }));
    } catch (e) {
      console.error(e);
      alert('Nu s-a putut adăuga.');
    }
  };

  return (
    <div className="w-full overflow-hidden flex flex-col gap-4 text-black ">
      {/* Filters / actions */}
      <FiltersUsers
        f={f}
        setF={setF}
        meta={meta}
        loadUsers={loadUsers}
        setMetaOpen={setMetaOpen}
        startAdd={startAdd}
        editingId={editingId}
      />
      <div className="w-full overflow-hidden  rounded-lg bg-white p-6">
        <div className=' overflow-x-auto rounded-xl w-full h-full'>
          <table className=" w-full border border-gray-200  ">
            <thead className="sticky top-0 h-20 bg-gray-200">
              <tr></tr>

              <tr className="">
                <th className="px-2 py-2 text-center font-semibold">Limbă</th>
                <th className="px-2 py-2 text-center font-semibold">Foto</th>
                <th className="px-2 py-2 text-center font-semibold">Email</th>
                <th className="px-2 py-2 text-center font-semibold">Nume</th>
                <th className="px-2 py-2 text-center font-semibold">Rol</th>

                <th className="px-2 py-2 text-center font-semibold">Telefon muncă</th>

                <th className="px-2 py-2 text-center font-semibold">Telefon personal</th>
                <th className="px-2 py-2 text-center font-semibold">Firma</th>

                <th className="px-2 py-2 text-center font-semibold">Departament</th>
                <th className="px-2 py-2 text-center font-semibold">Specializare</th>
                <th className="px-2 py-2 text-center font-semibold">Data naștere</th>
                <th className="px-2 py-2 text-center font-semibold">Creat</th>
                <th className="px-2 py-2 text-center font-semibold">Acțiuni</th>
              </tr>
            </thead>

            <tbody>
              {editingId === 'new' && rowDraft && (
                <RowEdit
                  row={rowDraft}
                  onChange={onChangeDraft}
                  onPickFile={onPickFile}
                  fileDraft={fileDraft}
                  onCancel={resetDraft}
                  onSave={saveDraft}
                  isNew
                  meta={meta}
                />
              )}

              {loading ? (
                <tr>
                  <td colSpan={15} className="px-3 py-4 text-center">Se încarcă...</td>
                </tr>
              ) : filteredUsers.length ? (
                filteredUsers.map((u) =>
                  editingId === u.id ? (
                    <RowEdit
                      key={u.id}
                      row={rowDraft}
                      onChange={onChangeDraft}
                      onPickFile={onPickFile}
                      fileDraft={fileDraft}
                      onCancel={resetDraft}
                      onSave={saveDraft}
                      previewUrl={u.photo_url ? `${photoAPI}/${u.photo_url}` : null}
                      meta={meta}
                    />
                  ) : (
                    <RowView
                      key={u.id}
                      u={u}
                      roleBadge={roleBadge}
                      capitalizeRole={capitalizeRole}
                      onEdit={() => startEdit(u)}
                      onDelete={() => requestDelete(u.id)}
                      confirmDel={confirmDel === u.id}
                      doDelete={() => doDelete(u.id)}
                      meta={meta}
                      cancelDelete={() => setConfirmDel(null)}
                    />
                  )
                )
              ) : (
                <tr>
                  <td colSpan={15} className="px-3 py-4 text-center">Nu există utilizatori.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Meta modal (unchanged layout) */}
      {metaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMetaOpen(false)} />
          <div className="relative z-10 bg-white rounded-2xl shadow-xl p-6 w-2/3 h-1/2 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h3 className="text-lg font-semibold">Meta (Firme / Departamente / Specializări)</h3>
              <button className="text-gray-500 hover:text-gray-700" onClick={() => setMetaOpen(false)}>
                <FontAwesomeIcon icon={faXmark} className="text-2xl text-red-500 hover:text-red-600" />
              </button>
            </div>
            <div className="grid md:grid-cols-3 gap-6 flex-1 min-h-0 overflow-hidden">
              <MetaColumn
                title="Firme"
                type="firma"
                items={meta.firma}
                inputValue={newMeta.firma}
                onInputChange={(v) => setNewMeta((p) => ({ ...p, firma: v }))}
                newColor={newMeta.firmaColor || '#666666'}
                onColorChange={(c) => setNewMeta((p) => ({ ...p, firmaColor: c }))}
                onAdd={() => addMeta('firma', newMeta.firma, newMeta.firmaColor)}
              />
              <MetaColumn
                title="Departamente"
                type="departament"
                items={meta.departament}
                inputValue={newMeta.departament}
                onInputChange={(v) => setNewMeta((p) => ({ ...p, departament: v }))}
                newColor={newMeta.departamentColor || '#666666'}
                onColorChange={(c) => setNewMeta((p) => ({ ...p, departamentColor: c }))}
                onAdd={() => addMeta('departament', newMeta.departament, newMeta.departamentColor)}
              />
              <MetaColumn
                title="Specializări"
                type="specializare"
                items={meta.specializare}
                inputValue={newMeta.specializare}
                onInputChange={(v) => setNewMeta((p) => ({ ...p, specializare: v }))}
                newColor={newMeta.specializareColor || '#666666'}
                onColorChange={(c) => setNewMeta((p) => ({ ...p, specializareColor: c }))}
                onAdd={() => addMeta('specializare', newMeta.specializare, newMeta.specializareColor)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetaColumn({ title, type, items, inputValue, onInputChange, newColor, onColorChange, onAdd }) {
  return (
    <div className="bg-gray-200 rounded-xl p-4 border flex flex-col min-h-0">
      <div className="font-semibold mb-2">{title}</div>
      <div className="flex-1 min-h-0 overflow-auto text-white p-4 bg-white rounded-lg border">
        {items?.length ? (
          <ul className="text-base w-full flex flex-col gap-4 justify-center">
            {items.map((it, i) => (
              <li key={`${it.name}-${i}`} style={{ backgroundColor: it.color_hex || '#666666' }} className="px-3 w-full justify-center rounded-full py-2 border-b last:border-b-0 flex items-center gap-2">
                {it.name}
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-3 py-6 text-center text-sm text-gray-500">Nimic încă</div>
        )}
      </div>
      <div className="mt-3 text-black flex gap-2 shrink-0">
        <input
          className="flex-1 bg-white rounded-lg px-3 py-2 shadow border outline-none"
          placeholder="Adaugă..."
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
        />
        <input
          type="color"
          className="w-12 h-10 rounded cursor-pointer"
          value={newColor}
          onChange={(e) => onColorChange(e.target.value)}
        />
        <button className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-3 py-2" onClick={onAdd} type="button">
          Adaugă
        </button>
      </div>
    </div>
  );
}

function RowView({
  u,
  roleBadge,
  capitalizeRole,
  onEdit,
  onDelete,
  confirmDel,
  doDelete,
  cancelDelete,
  meta,
}) {

  const firma = meta.firma.find((f) => f.id == u.firma_id) || {};
  const departament = meta.departament.find((d) => d.id == u.departament_id) || {};
  const specializare = meta.specializare.find((s) => s.id == u.specializare_id) || {};

  return (
    <tr className={`border-t border-gray-300 ${confirmDel ? 'bg-red-100' : ''}`} >
      <td className="px-2 py-2 text-center font-semibold">{u.limba}</td>
      <td className="px-2 py-2">
        <div className="flex justify-center">
          {/* container cu lățime controlată */}
          <div className="relative w-12 sm:w-14 md:w-16 lg:w-20">
            {/* spacer pentru pătrat (fallback universal) */}
            <div className="block pb-[100%]" />

            {/* imaginea umple pătratul, nu mai „trage” pe înălțime */}
            <img
              className="absolute inset-0 w-full h-full block object-cover rounded-xl border border-black overflow-hidden"
              src={u.photo_url ? `${photoAPI}/${u.photo_url}` : defaultPhoto}
              alt=""
            />
          </div>
        </div>
      </td>
      <td className="px-2 py-2 text-center">{u.email}</td>
      <td className="px-2 py-2 text-center">{u.name}</td>
      <td className="px-2 py-2 text-center">
        <span className={`px-6 py-2 rounded-3xl text-white ${roleBadge(u.role)}`}>
          {capitalizeRole(u.role)}
        </span>
      </td>
      <td className="px-2 py-2 text-center">
        {(u.telefon_prefix && u.telephone) ? `${u.telefon_prefix} ${u.telephone}` : '-'}
      </td>

      <td className="px-2 py-2 text-center">
        {(u.telefon_prefix_1 && u.telephone_1) ? `${u.telefon_prefix_1} ${u.telephone_1}` : '-'}
      </td>
      <td className="px-2 py-2 text-center">
        <span className={`px-6 py-2 rounded-3xl  ${firma.color_hex ? 'text-white' : 'text-black'}`} style={{ backgroundColor: firma.color_hex || '' }}>
          {firma.name || '-'}
        </span>
      </td>
      <td className="px-2 py-2 text-center">
        <span className={`px-6 py-2 rounded-3xl  ${departament.color_hex ? 'text-white' : 'text-black'}`} style={{ backgroundColor: departament.color_hex || '' }}>
          {departament.name || '-'}
        </span>
      </td>
      <td className="px-2 py-2 text-center">
        <span className={`px-6 py-2 rounded-3xl ${specializare.color_hex ? 'text-white' : 'text-black'}`} style={{ backgroundColor: specializare.color_hex || '' }}>
          {specializare.name || '-'}
        </span>
      </td>

      <td className="px-2 py-2 text-center">{u.data_nastere ? u.data_nastere.split('T')[0] : '-'}</td>
      <td className="px-2 py-2 text-center">{u.created_at ? u.created_at.slice(0, 10) : '-'}</td>
      <td className="px-2 py-2">
        <div className="flex justify-center items-center  gap-4 text-lg">
          {!confirmDel ? (
            <>
              <FontAwesomeIcon onClick={onEdit} className="hover:cursor-pointer text-xl text-green-500 hover:text-green-600 hover:scale-105" icon={faPenToSquare} title="Edit" />
              <FontAwesomeIcon onClick={onDelete} className="hover:cursor-pointer text-xl text-red-500 hover:text-red-600 hover:scale-105" icon={faTrashCan} title="Delete" />
            </>
          ) : (
            <div className='text-sm flex flex-col gap-2'>
              <button onClick={doDelete} className="bg-red-500 hover:bg-red-600 text-white rounded-lg px-3 py-1">Delete</button>
              <button onClick={cancelDelete} className="bg-gray-300 hover:bg-gray-400 rounded-lg px-3 py-1">Cancel</button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

function RowEdit({
  row,
  onChange,
  onPickFile,
  fileDraft,
  previewUrl,
  onCancel,
  onSave,
  isNew = false,
  meta
}) {
  const displayPreview = fileDraft
    ? URL.createObjectURL(fileDraft)
    : previewUrl || null;

  const [dragOver, setDragOver] = React.useState(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) onPickFile(file);
  };

  return (
    <tr className="bg-green-100 border-t text-sm border-black/5">
      {/* Limbă */}
      <td className="px-2 py-2 text-center">
        <select className="px-2 py-2 rounded-lg outline-none shadow-sm bg-white" value={row.limba} onChange={(e) => onChange('limba', e.target.value)}>
          {LIMBA_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </td>

      {/* Foto */}
      <td className="px-2 py-2">
        <div className="flex justify-center">
          <div
            className={`w-12 sm:w-14 md:w-16 lg:w-20 aspect-square relative rounded-xl border
        ${dragOver ? 'border-green-500 ring-2 ring-green-300' : 'border-black/10'}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            title="Trage o imagine aici sau fă click pe iconiță"
          >
            <img className="rounded-xl object-cover w-full h-full" src={displayPreview || defaultPhoto} alt="preview" />
            <label className="absolute -bottom-2 -right-2 bg-white rounded-full p-2 shadow cursor-pointer">
              <FontAwesomeIcon icon={faImage} />
              <input type="file" className="hidden" onChange={(e) => onPickFile(e.target.files?.[0])} />
            </label>
          </div>
        </div>
      </td>

      {/* Email */}
      <td className="px-2 py-2 text-center">
        <input
          className="px-2 w-full text-center py-2 rounded-lg shadow-sm bg-white"
          value={row.email}
          onChange={(e) => onChange('email', e.target.value)}
          placeholder="Email"
        />
      </td>

      {/* Nume */}
      <td className="px-2 py-2 text-center">
        <input
          className="px-2 w-full text-center py-2 rounded-lg shadow-sm bg-white"
          value={row.name}
          onChange={(e) => onChange('name', e.target.value)}
          placeholder="Nume"
        />
      </td>

      {/* Rol (move it here to match header) */}
      <td className="px-2 py-2 text-center">
        <select
          className="px-2 py-2 rounded-lg outline-none shadow-sm bg-white"
          value={row.role}
          onChange={(e) => onChange('role', e.target.value)}
        >
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </option>
          ))}
        </select>
      </td>

      {/* Telefon birou (single cell, with flags) */}
      <td className="px-2 py-2">
        <PhoneInput
          country="ro"
          placeholder="Telefon muncă"
          value={`${(row.telefon_prefix || '').replace('+', '')}${row.telephone || ''}`}
          onChange={(val, country) => {
            const dial = country?.dialCode ? `+${country.dialCode}` : '';
            const national =
              country?.dialCode && val?.startsWith(country.dialCode)
                ? val.slice(country.dialCode.length)
                : val || '';
            onChange('telefon_prefix', dial);
            onChange('telephone', national);
          }}
          inputProps={{ name: 'phone_office', autoComplete: 'off' }}
          containerClass="w-full"
          inputClass="!w-full !py-2 !pl-12 !pr-3 !text-center !bg-white !rounded-lg !shadow-sm !border"
          buttonClass="!border !border-gray-300 !rounded-l-lg"
          dropdownClass="!text-black"
          enableSearch
        />
      </td>

      {/* Telefon personal (single cell, with flags) */}
      <td className="px-2 py-2">
        <PhoneInput
          country="ro"
          placeholder="Telefon personal"
          value={`${(row.telefon_prefix_1 || '').replace('+', '')}${row.telephone_1 || ''}`}
          onChange={(val, country) => {
            const dial = country?.dialCode ? `+${country.dialCode}` : '';
            const national =
              country?.dialCode && val?.startsWith(country.dialCode)
                ? val.slice(country.dialCode.length)
                : val || '';
            onChange('telefon_prefix_1', dial);
            onChange('telephone_1', national);
          }}
          inputProps={{ name: 'phone_personal', autoComplete: 'off' }}
          containerClass="w-full"
          inputClass="!w-full !py-2 !pl-12 !pr-3 !text-center !bg-white !rounded-lg !shadow-sm !border"
          buttonClass="!border !border-gray-300 !rounded-l-lg"
          dropdownClass="!text-black"
          enableSearch
        />
      </td>

      {/* Firma */}
      <td className="px-2 py-2 text-center">
        <select
          className="px-2 py-2 rounded-lg max-w-40 outline-none text-ellipsis shadow-sm bg-white"
          value={row.firma_id || ''}
          onChange={(e) => onChange('firma_id', e.target.value)}
        >
          <option value="">—</option>
          {meta.firma.map(x => (
            <option key={x.id ?? x.name} value={x.id}>{x.name}</option>
          ))}
        </select>
      </td>

      {/* Departament */}
      <td className="px-2 py-2 text-center">
        <select
          className="px-2 py-2 rounded-lg max-w-40 outline-none shadow-sm text-ellipsis bg-white"
          value={row.departament_id || ''}
          onChange={(e) => onChange('departament_id', e.target.value)}
        >
          <option value="">—</option>
          {meta.departament.map(x => (
            <option key={x.id ?? x.name} value={x.id}>{x.name}</option>
          ))}
        </select>
      </td>

      {/* Specializare */}
      <td className="px-2 py-2 text-center">
        <select
          className="px-2 py-2 rounded-lg outline-none max-w-40 shadow-sm text-ellipsis bg-white"
          value={row.specializare_id || ''}
          onChange={(e) => onChange('specializare_id', e.target.value)}
        >
          <option value="">—</option>
          {meta.specializare.map(x => (
            <option key={x.id ?? x.name} value={x.id}>{x.name}</option>
          ))}
        </select>
      </td>

      {/* Data naștere */}
      <td className="px-2 py-2 text-center">
        <input
          type="date"
          className="px-2 w-full text-center py-2 rounded-lg shadow-sm bg-white"
          value={row.data_nastere || ''}
          onChange={(e) => onChange('data_nastere', e.target.value)}
        />
      </td>

      {/* Creat */}
      <td className="px-2 py-2 text-center">{isNew ? '-' : '—'}</td>

      {/* Acțiuni (unchanged) */}
      <td className="px-2 py-2">
        <div className="flex items-center flex-col justify-center gap-2">
          <input
            type="password"
            className="px-2 py-2 rounded-lg shadow-sm bg-white w-36"
            placeholder={isNew ? 'Parolă (req)' : 'Parolă (opțional)'}
            value={row.password}
            onChange={(e) => onChange('password', e.target.value)}
          />
          <div className='flex gap-2'>
            <button
              className="bg-green-500 hover:bg-green-600 text-white rounded-lg px-3 py-2 flex items-center gap-2"
              onClick={onSave}
              type="button"
            >
              <FontAwesomeIcon icon={faFloppyDisk} />
            </button>
            <button
              className="bg-red-500 hover:bg-red-600 text-white rounded-lg px-3 py-2 flex items-center gap-2"
              onClick={onCancel}
              type="button"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}