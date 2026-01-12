
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { supabase } from '../services/supabase';
import { MotoSpec } from '../types';
import { useApp } from '../App';

const TechnicalSpecs: React.FC = () => {
    const { currentUser } = useApp();
    const [specs, setSpecs] = useState<MotoSpec[]>([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        category: '',
        component_name: '',
        spec_value: '',
        notes: ''
    });
    const [editingId, setEditingId] = useState<string | null>(null);

    // Permisos: Solo owner, coordinator y team_lead pueden editar.
    const canEdit = currentUser && ['owner', 'coordinator', 'team_lead'].includes(currentUser.role);

    useEffect(() => {
        fetchSpecs();
    }, []);

    const fetchSpecs = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('moto_specs')
            .select('*')
            .order('category', { ascending: true });

        if (error) console.error('Error fetching specs:', error);
        else setSpecs(data || []);
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canEdit) return;

        if (editingId) {
            const { error } = await supabase
                .from('moto_specs')
                .update(formData)
                .eq('id', editingId);

            if (!error) {
                setSpecs(prev => prev.map(item => item.id === editingId ? { ...item, ...formData } : item));
                setEditingId(null);
                setFormData({ category: '', component_name: '', spec_value: '', notes: '' });
            }
        } else {
            const { data, error } = await supabase
                .from('moto_specs')
                .insert([formData])
                .select()
                .single();

            if (!error && data) {
                setSpecs([...specs, data]);
                setFormData({ category: '', component_name: '', spec_value: '', notes: '' });
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
    };

    const handleDelete = async (id: string) => {
        if (!canEdit) return;
        if (!confirm('¿Estás seguro de eliminar este dato?')) return;

        const { error } = await supabase.from('moto_specs').delete().eq('id', id);
        if (!error) {
            setSpecs(specs.filter(item => item.id !== id));
        }
    };

    const handleCancel = () => {
        setEditingId(null);
        setFormData({ category: '', component_name: '', spec_value: '', notes: '' });
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-background-dark">
            <Header title="Datos Técnicos" subtitle="Base de conocimiento del prototipo" />

            <div className="flex-1 overflow-y-auto custom-scroll p-4 lg:p-8 space-y-8">

                {/* Formulario - Solo visible para roles permitidos o si se está editando (doble check) */}
                {canEdit && (
                    <div className="bg-card-dark border border-white/5 rounded-[32px] p-6 lg:p-8 shadow-xl">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">add_circle</span>
                            {editingId ? 'Editar Dato Técnico' : 'Añadir Nuevo Dato'}
                        </h3>

                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-500 uppercase ml-2 tracking-widest">Categoría</label>
                                <input
                                    required
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    placeholder="Ej: Batería"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:border-primary outline-none transition-all"
                                />
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
                                <label className="text-[10px] font-black text-gray-500 uppercase ml-2 tracking-widest">Valor/Medida</label>
                                <input
                                    required
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

                            <div className="md:col-span-2 lg:col-span-4 flex justify-end gap-3 mt-2">
                                {editingId && (
                                    <button type="button" onClick={handleCancel} className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all">
                                        Cancelar
                                    </button>
                                )}
                                <button type="submit" className="px-8 py-3 bg-primary text-black rounded-xl text-xs font-black uppercase tracking-widest shadow-glow hover:scale-105 transition-transform">
                                    {editingId ? 'Actualizar Dato' : 'Guardar Dato'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Tabla */}
                <div className="bg-card-dark border border-white/5 rounded-[32px] overflow-hidden shadow-xl">
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
                                    {canEdit && <th className="p-4 text-right pr-6">Acciones</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    <tr>
                                        <td colSpan={canEdit ? 5 : 4} className="p-8 text-center text-gray-500 animate-pulse text-xs font-bold uppercase tracking-widest">Cargando datos...</td>
                                    </tr>
                                ) : specs.length === 0 ? (
                                    <tr>
                                        <td colSpan={canEdit ? 5 : 4} className="p-8 text-center text-gray-500 text-xs font-bold uppercase tracking-widest">No hay datos registrados aún.</td>
                                    </tr>
                                ) : (
                                    specs.map((spec) => (
                                        <tr key={spec.id} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="p-4 pl-6 font-bold text-brand-elec">{spec.category}</td>
                                            <td className="p-4 font-bold text-white">{spec.component_name}</td>
                                            <td className="p-4 text-gray-300 font-mono text-sm bg-white/5 rounded-lg w-fit my-2 mx-4 inline-block">{spec.spec_value}</td>
                                            <td className="p-4 text-gray-500 text-sm max-w-xs truncate">{spec.notes}</td>
                                            {canEdit && (
                                                <td className="p-4 text-right pr-6">
                                                    <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => handleEdit(spec)} className="p-2 hover:bg-brand-elec/20 hover:text-brand-elec rounded-lg text-gray-400 transition-colors">
                                                            <span className="material-symbols-outlined text-[18px]">edit</span>
                                                        </button>
                                                        <button onClick={() => handleDelete(spec.id)} className="p-2 hover:bg-red-500/20 hover:text-red-500 rounded-lg text-gray-400 transition-colors">
                                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                                        </button>
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
        </div>
    );
};

export default TechnicalSpecs;
