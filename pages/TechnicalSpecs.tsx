import React, { useState, useEffect, useRef } from 'react';
import Header from '../components/Header';
import { supabase } from '../services/supabase';
import { MotoSpec } from '../types';
import { useApp } from '../App';
import { useLocation } from 'react-router-dom';

const TechnicalSpecs: React.FC = () => {
    const { currentUser } = useApp();
    const location = useLocation();
    const [specs, setSpecs] = useState<MotoSpec[]>([]);
    const [loading, setLoading] = useState(true);
    const [highlightedId, setHighlightedId] = useState<string | null>(null);

    // File Upload State
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    // UI States
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false); // Mobile accordion for form

    const [formData, setFormData] = useState({
        category: '',
        component_name: '',
        spec_value: '',
        notes: ''
    });
    const [editingId, setEditingId] = useState<string | null>(null);

    // Permisos
    const canEdit = currentUser && ['owner', 'coordinator', 'team_lead'].includes(currentUser.role);

    const canDelete = (item: MotoSpec) => {
        if (!currentUser) return false;
        if (['owner', 'coordinator'].includes(currentUser.role)) return true;
        if (currentUser.role === 'team_lead') {
            const itemBranch = item.branch || 'General';
            return currentUser.branch === itemBranch;
        }
        return false;
    };

    useEffect(() => {
        fetchSpecs();
    }, []);

    // Deep Linking Scroll Effect
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const targetId = params.get('id');

        if (targetId && !loading && specs.length > 0) {
            setHighlightedId(targetId);
            const element = document.getElementById(`spec-${targetId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => setHighlightedId(null), 3000);
            }
        }
    }, [location.search, loading, specs]);

    const fetchSpecs = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('moto_specs')
            .select('*')
            .order('category', { ascending: true });

        if (error) console.error('Error fetching specs:', error);
        else setSpecs(data as MotoSpec[] || []);
        setLoading(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const selectedFile = e.target.files[0];
            if (selectedFile.size > 5 * 1024 * 1024) {
                alert("El archivo es demasiado grande (Máx 5MB)");
                e.target.value = "";
                setFile(null);
                return;
            }
            setFile(selectedFile);
        }
    };

    const uploadFile = async (fileToUpload: File): Promise<string | null> => {
        try {
            setUploading(true);
            const fileExt = fileToUpload.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('technical-files')
                .upload(filePath, fileToUpload);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('technical-files').getPublicUrl(filePath);
            return data.publicUrl;
        } catch (error) {
            console.error(error);
            alert('Error subiendo archivo.');
            return null;
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canEdit) return;

        let fileUrl = undefined;
        if (file) {
            const uploadedUrl = await uploadFile(file);
            if (!uploadedUrl) return;
            fileUrl = uploadedUrl;
        }

        const payload = {
            ...formData,
            ...(fileUrl && { file_url: fileUrl }),
            branch: currentUser?.branch || 'General'
        };

        if (editingId) {
            const { error } = await supabase
                .from('moto_specs')
                .update(payload)
                .eq('id', editingId);

            if (!error) {
                setSpecs(prev => prev.map(item => item.id === editingId ? { ...item, ...payload, file_url: fileUrl || item.file_url, branch: payload.branch } : item));
                setEditingId(null);
                setFormData({ category: '', component_name: '', spec_value: '', notes: '' });
                setFile(null);
                setIsFormOpen(false);
            }
        } else {
            const { data, error } = await supabase
                .from('moto_specs')
                .insert([payload])
                .select()
                .single();

            if (!error && data) {
                setSpecs([...specs, data as MotoSpec]);
                setFormData({ category: '', component_name: '', spec_value: '', notes: '' });
                setFile(null);
                setIsFormOpen(false);
            }
        }
    };

    const handleEdit = (item: MotoSpec) => {
        if (!canEdit) return;
        setEditingId(item.id);
        setFormData({
            category: item.category,
            component_name: item.component_name,
            spec_value: item.spec_value,
            notes: item.notes || ''
        });
        setFile(null);
        setIsFormOpen(true); // Open form to edit
        // Scroll to form?
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const confirmDelete = (id: string) => {
        setDeleteTargetId(id);
        setDeleteModalOpen(true);
    };

    const executeDelete = async () => {
        if (!deleteTargetId || !canEdit) return;

        const { error } = await supabase.from('moto_specs').delete().eq('id', deleteTargetId);
        if (!error) {
            setSpecs(specs.filter(item => item.id !== deleteTargetId));
        }
        setDeleteModalOpen(false);
        setDeleteTargetId(null);
    };

    const handleCancel = () => {
        setEditingId(null);
        setFormData({ category: '', component_name: '', spec_value: '', notes: '' });
        setFile(null);
        setIsFormOpen(false);
    };

    // Mobile Card Logic
    const SpecCard = ({ spec }: { spec: MotoSpec }) => (
        <div
            id={`spec-${spec.id}`}
            className={`bg-[#141414] border border-white/5 rounded-2xl p-4 shadow-lg mb-4 ${highlightedId === spec.id ? 'ring-2 ring-primary ring-opacity-50' : ''}`}
        >
            <div className="flex justify-between items-start mb-2">
                <div>
                    <span className="text-[10px] uppercase font-black tracking-widest text-brand-elec">{spec.category}</span>
                    <h3 className="text-lg font-bold text-white mt-1">{spec.component_name}</h3>
                </div>
                {spec.file_url && (
                    <a href={spec.file_url} target="_blank" rel="noopener noreferrer" className="w-8 h-8 flex items-center justify-center bg-white/5 rounded-full text-emerald-500 hover:bg-emerald-500 hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-sm">download</span>
                    </a>
                )}
            </div>

            <div className="space-y-2 mt-3">
                <div className="flex items-center justify-between p-2 bg-white/[0.02] rounded-lg">
                    <span className="text-xs text-gray-500 font-bold uppercase">Valor</span>
                    <span className="text-sm text-primary font-mono">{spec.spec_value || '-'}</span>
                </div>
                {spec.notes && (
                    <div className="p-2">
                        <p className="text-xs text-gray-400 italic line-clamp-3">{spec.notes}</p>
                    </div>
                )}
            </div>

            {canEdit && (
                <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-white/5">
                    <button onClick={() => handleEdit(spec)} className="text-gray-400 hover:text-white flex items-center gap-1 text-xs font-bold uppercase">
                        <span className="material-symbols-outlined text-sm">edit</span> Editar
                    </button>
                    {canDelete(spec) && (
                        <button onClick={() => confirmDelete(spec.id)} className="text-red-500/70 hover:text-red-500 flex items-center gap-1 text-xs font-bold uppercase">
                            <span className="material-symbols-outlined text-sm">delete</span> Borrar
                        </button>
                    )}
                </div>
            )}
        </div>
    );

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-background-dark relative">
            <Header title="Datos Técnicos" subtitle="Base de Conocimiento" />

            <div className={`flex-1 overflow-y-auto custom-scroll p-4 lg:p-8 space-y-6 lg:space-y-8 pb-32 ${deleteModalOpen ? 'blur-sm' : ''}`}>

                {/* Helper for FAB spacing */}
                <div className="h-20 md:hidden"></div>

                {/* Formulario (Responsive: Modal on Mobile, Block on Desktop) */}
                {canEdit && (isFormOpen || window.innerWidth >= 768) && (
                    <>
                        {/* Mobile Modal Backdrop */}
                        <div className={`md:hidden fixed inset-0 bg-black/80 backdrop-blur-md z-[100] ${isFormOpen ? 'animate-in fade-in' : 'hidden'}`} onClick={() => setIsFormOpen(false)}></div>

                        <div className={`
                            md:relative md:inset-auto md:bg-card-dark md:transform-none md:w-auto md:h-auto
                            fixed bottom-0 left-0 right-0 bg-[#1a1a1a] rounded-t-[32px] p-6 shadow-2xl z-[101] max-h-[90vh] overflow-y-auto
                            ${isFormOpen ? 'animate-in slide-in-from-bottom-10 block' : 'hidden md:block'}
                            border border-white/5
                        `}>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">add_circle</span>
                                    {editingId ? 'Editar Dato' : 'Nuevo Dato'}
                                </h3>
                                {/* Mobile Close Button */}
                                <button onClick={() => setIsFormOpen(false)} className="md:hidden w-8 h-8 flex items-center justify-center bg-white/10 rounded-full text-white hover:bg-white/20">
                                    <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-500 uppercase ml-2 tracking-widest">Categoría</label>
                                    <div className="relative">
                                        <select
                                            required
                                            value={formData.category}
                                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                                            className="w-full bg-[#111] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:border-primary outline-none appearance-none cursor-pointer"
                                        >
                                            <option value="" disabled className="text-gray-500">Seleccionar...</option>
                                            <option value="General">General</option>
                                            <option value="Mecánica">Mecánica</option>
                                            <option value="Eléctrica">Eléctrica</option>
                                            <option value="Administración">Administración</option>
                                        </select>
                                        <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">expand_more</span>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-500 uppercase ml-2 tracking-widest">Componente</label>
                                    <input
                                        required
                                        value={formData.component_name}
                                        onChange={e => setFormData({ ...formData, component_name: e.target.value })}
                                        placeholder="Ej: Batería HV"
                                        className="w-full bg-[#111] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:border-primary outline-none transition-all"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-500 uppercase ml-2 tracking-widest">Valor</label>
                                    <input
                                        value={formData.spec_value}
                                        onChange={e => setFormData({ ...formData, spec_value: e.target.value })}
                                        placeholder="Ej: 400V"
                                        className="w-full bg-[#111] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:border-primary outline-none transition-all"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-500 uppercase ml-2 tracking-widest">Notas</label>
                                    <input
                                        value={formData.notes}
                                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                        placeholder="Detalles..."
                                        className="w-full bg-[#111] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:border-primary outline-none transition-all"
                                    />
                                </div>

                                <div className="md:col-span-2 lg:col-span-4 flex items-center justify-between mt-4 border-t border-white/5 pt-4">
                                    <div className="flex items-center gap-3">
                                        <label className={`cursor-pointer flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${file ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/50' : 'bg-[#111] text-gray-400 hover:text-white border border-white/10'}`}>
                                            <span className="material-symbols-outlined text-[18px]">{file ? 'check_circle' : 'attach_file'}</span>
                                            <span className="text-xs font-bold uppercase tracking-wider">{file ? 'Listo' : 'Adjuntar'}</span>
                                            <input type="file" onChange={handleFileChange} className="hidden" />
                                        </label>
                                    </div>

                                    <div className="flex gap-3">
                                        {editingId && (
                                            <button type="button" onClick={handleCancel} className="px-6 py-3 bg-[#111] hover:bg-white/10 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all">
                                                Cancelar
                                            </button>
                                        )}
                                        <button
                                            type="submit"
                                            disabled={uploading}
                                            className={`px-8 py-3 bg-primary text-black rounded-xl text-xs font-black uppercase tracking-widest shadow-glow hover:scale-105 transition-transform ${uploading ? 'opacity-50 cursor-wait' : ''}`}
                                        >
                                            {uploading ? '...' : (editingId ? 'Guardar' : 'Crear')}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </>
                )}

                {/* Mobile: Cards View */}
                <div className="md:hidden space-y-4">
                    {loading ? (
                        <p className="text-center text-gray-500 text-xs animate-pulse">Cargando...</p>
                    ) : specs.length === 0 ? (
                        <p className="text-center text-gray-500 text-xs py-8">No hay datos.</p>
                    ) : (
                        specs.map(spec => <SpecCard key={spec.id} spec={spec} />)
                    )}
                </div>

                {/* Desktop: Table View */}
                <div className="hidden md:block bg-card-dark border border-white/5 rounded-[32px] overflow-hidden shadow-xl">
                    <div className="p-6 border-b border-white/5">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">dataset</span>
                            Base de Datos
                        </h3>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/5 text-[10px] uppercase tracking-widest text-gray-400 font-black">
                                    <th className="p-4 pl-6">Categoría</th>
                                    <th className="p-4">Componente</th>
                                    <th className="p-4">Valor</th>
                                    <th className="p-4">Notas</th>
                                    <th className="p-4 text-center">Archivo</th>
                                    {canEdit && <th className="p-4 text-right pr-6">Acciones</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading && (<tr><td colSpan={6} className="p-4 text-center text-gray-500">Cargando...</td></tr>)}
                                {!loading && specs.map((spec) => (
                                    <tr
                                        key={spec.id}
                                        id={`spec-desktop-${spec.id}`}
                                        className={`hover:bg-white/[0.02] transition-colors group ${highlightedId === spec.id ? 'bg-primary/10 border-l-4 border-primary' : ''}`}
                                    >
                                        <td className="p-4 pl-6 font-bold text-brand-elec">{spec.category}</td>
                                        <td className="p-4 font-bold text-white">{spec.component_name}</td>
                                        <td className="p-4 text-gray-300 font-mono text-sm bg-white/5 rounded-lg w-fit my-2 mx-4 inline-block">{spec.spec_value}</td>
                                        <td className="p-4 text-gray-500 text-sm max-w-xs truncate">{spec.notes}</td>
                                        <td className="p-4 text-center">
                                            {spec.file_url ? (
                                                <a href={spec.file_url} target="_blank" rel="noopener noreferrer" className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500 hover:text-white transition-colors inline-flex">
                                                    <span className="material-symbols-outlined text-[18px]">download</span>
                                                </a>
                                            ) : '-'}
                                        </td>
                                        {canEdit && (
                                            <td className="p-4 text-right pr-6">
                                                <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleEdit(spec)} className="p-2 hover:bg-brand-elec/20 hover:text-brand-elec rounded-lg text-gray-400 transition-colors">
                                                        <span className="material-symbols-outlined text-[18px]">edit</span>
                                                    </button>
                                                    {canDelete(spec) && (
                                                        <button onClick={() => confirmDelete(spec.id)} className="p-2 hover:bg-red-500/20 hover:text-red-500 rounded-lg text-gray-400 transition-colors">
                                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* DELETE CONFIRMATION MODAL */}
            {deleteModalOpen && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-card-dark border border-white/10 p-8 rounded-[32px] max-w-sm w-full shadow-2xl animate-in zoom-in-95">
                        <h3 className="text-xl font-black text-white text-center mb-4">¿Eliminar?</h3>
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => setDeleteModalOpen(false)} className="py-2 px-6 bg-white/10 rounded-xl text-xs font-bold">Cancelar</button>
                            <button onClick={executeDelete} className="py-2 px-6 bg-red-600 text-white rounded-xl text-xs font-bold">Eliminar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TechnicalSpecs;
