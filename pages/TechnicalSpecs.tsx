
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

    // Delete Modal State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        category: '',
        component_name: '',
        spec_value: '',
        notes: ''
    });
    const [editingId, setEditingId] = useState<string | null>(null);

    // Permisos: Solo owner, coordinator y team_lead pueden editar.
    const canEdit = currentUser && ['owner', 'coordinator', 'team_lead'].includes(currentUser.role);

    // Filtro de Seguridad para Borrar:
    // Owner/Coord pueden borrar todo. Team Lead solo de su rama (pero aquí asumimos que moto_spec.branch existe).
    // Si moto_spec no tiene rama guardada (legacy), asumimos 'General' o que cualquiera con permiso global puede borrar.
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
                // Remove highlight after 3 seconds
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
            // Validación 5MB
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

            if (uploadError) {
                console.error('Error detallado subiendo archivo:', uploadError);
                alert(`Error subiendo archivo: ${uploadError.message}`);
                throw uploadError;
            }

            const { data } = supabase.storage.from('technical-files').getPublicUrl(filePath);
            return data.publicUrl;
        } catch (error) {
            alert('Error subiendo archivo. Inténtalo de nuevo.');
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
            if (!uploadedUrl) return; // Stop if upload failed
            fileUrl = uploadedUrl;
        }

        const payload = {
            ...formData,
            ...(fileUrl && { file_url: fileUrl }),
            branch: currentUser?.branch || 'General' // Asignar rama del creador o General
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
        setFile(null); // Reset file input for editing (adding new file replaces old)
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
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-background-dark relative">
            <Header title="Datos Técnicos" subtitle="Base de conocimiento del prototipo" />

            <div className={`flex-1 overflow-y-auto custom-scroll p-4 lg:p-8 space-y-8 ${deleteModalOpen ? 'blur-sm' : ''}`}>

                {/* Formulario */}
                {canEdit && (
                    <div className="bg-card-dark border border-white/5 rounded-[32px] p-6 lg:p-8 shadow-xl">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">add_circle</span>
                            {editingId ? 'Editar Dato Técnico' : 'Añadir Nuevo Dato'}
                        </h3>

                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-500 uppercase ml-2 tracking-widest">Categoría</label>
                                <div className="relative">
                                    <select
                                        required
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full bg-background-dark border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:border-primary outline-none appearance-none cursor-pointer"
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
                                <label className="text-[10px] font-black text-gray-500 uppercase ml-2 tracking-widest">Nombre Componente</label>
                                <input
                                    required
                                    value={formData.component_name}
                                    onChange={e => setFormData({ ...formData, component_name: e.target.value })}
                                    placeholder="Ej: Celda Pack A"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:border-primary outline-none transition-all"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-500 uppercase ml-2 tracking-widest">Valor/Medida (Opcional)</label>
                                <input
                                    value={formData.spec_value}
                                    onChange={e => setFormData({ ...formData, spec_value: e.target.value })}
                                    placeholder="Ej: 3.8V"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:border-primary outline-none transition-all"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-500 uppercase ml-2 tracking-widest">Notas (Opcional)</label>
                                <input
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Detalles extra..."
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:border-primary outline-none transition-all"
                                />
                            </div>

                            <div className="md:col-span-2 lg:col-span-4 flex items-center justify-between mt-4 border-t border-white/5 pt-4">
                                <div className="flex items-center gap-3">
                                    <label className={`cursor-pointer flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${file ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/50' : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'}`}>
                                        <span className="material-symbols-outlined text-[18px]">{file ? 'check_circle' : 'attach_file'}</span>
                                        <span className="text-xs font-bold uppercase tracking-wider">{file ? 'Archivo Listo' : 'Adjuntar'}</span>
                                        <input type="file" onChange={handleFileChange} className="hidden" />
                                    </label>
                                    {file && <span className="text-[10px] text-gray-500 truncate max-w-[150px]">{file.name}</span>}
                                </div>

                                <div className="flex gap-3">
                                    {editingId && (
                                        <button type="button" onClick={handleCancel} className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all">
                                            Cancelar
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={uploading}
                                        className={`px-8 py-3 bg-primary text-black rounded-xl text-xs font-black uppercase tracking-widest shadow-glow hover:scale-105 transition-transform ${uploading ? 'opacity-50 cursor-wait' : ''}`}
                                    >
                                        {uploading ? 'Subiendo...' : (editingId ? 'Actualizar' : 'Guardar')}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                )}

                {/* Tabla */}
                <div className="bg-card-dark border border-white/5 rounded-[32px] overflow-hidden shadow-xl">
                    <div className="p-6 border-b border-white/5">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">dataset</span>
                            Base de Datos Técnico
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
                                {loading ? (
                                    <tr>
                                        <td colSpan={canEdit ? 6 : 5} className="p-8 text-center text-gray-500 animate-pulse text-xs font-bold uppercase tracking-widest">Cargando datos...</td>
                                    </tr>
                                ) : specs.length === 0 ? (
                                    <tr>
                                        <td colSpan={canEdit ? 6 : 5} className="p-8 text-center text-gray-500 text-xs font-bold uppercase tracking-widest">No hay datos registrados aún.</td>
                                    </tr>
                                ) : (
                                    specs.map((spec) => (
                                        <tr
                                            key={spec.id}
                                            id={`spec-${spec.id}`}
                                            className={`hover:bg-white/[0.02] transition-colors group ${highlightedId === spec.id ? 'bg-primary/10 border-l-4 border-primary' : ''}`}
                                        >
                                            <td className="p-4 pl-6 font-bold text-brand-elec">{spec.category}</td>
                                            <td className="p-4 font-bold text-white">
                                                {spec.component_name}
                                                {spec.branch && <span className="ml-2 text-[8px] px-1.5 py-0.5 rounded border border-white/10 text-gray-500 uppercase">{spec.branch}</span>}
                                            </td>
                                            <td className="p-4 text-gray-300 font-mono text-sm bg-white/5 rounded-lg w-fit my-2 mx-4 inline-block">{spec.spec_value}</td>
                                            <td className="p-4 text-gray-500 text-sm max-w-xs truncate">{spec.notes}</td>
                                            <td className="p-4 text-center">
                                                {spec.file_url ? (
                                                    <a href={spec.file_url} target="_blank" rel="noopener noreferrer" className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500 hover:text-white transition-colors inline-flex">
                                                        <span className="material-symbols-outlined text-[18px]">download</span>
                                                    </a>
                                                ) : (
                                                    <span className="text-gray-700 text-[10px] uppercase font-bold">-</span>
                                                )}
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
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* DELETE CONFIRMATION MODAL */}
            {deleteModalOpen && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-card-dark border border-white/10 p-8 rounded-[32px] max-w-sm w-full shadow-2xl animate-in zoom-in-95">
                        <div className="bg-red-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
                            <span className="material-symbols-outlined text-3xl">warning</span>
                        </div>
                        <h3 className="text-xl font-black text-white text-center mb-2">¿Eliminar dato?</h3>
                        <p className="text-gray-400 text-center text-xs mb-8">
                            ¿Estás seguro de que quieres eliminar este dato y su archivo adjunto? Esta acción es irreversible.
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setDeleteModalOpen(false)} className="py-3 bg-white/5 hover:bg-white/10 text-gray-300 font-bold rounded-xl uppercase text-[10px] tracking-widest transition-colors">
                                Cancelar
                            </button>
                            <button onClick={executeDelete} className="py-3 bg-red-500 hover:bg-red-600 text-white font-black rounded-xl uppercase text-[10px] tracking-widest shadow-glow transition-colors">
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TechnicalSpecs;
