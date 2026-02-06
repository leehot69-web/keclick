
import React, { useState } from 'react';
import { KitchenStation } from '../types';

interface KitchenStationManagementModalProps {
    stations: KitchenStation[];
    onSave: (stations: KitchenStation[]) => void;
    onClose: () => void;
}

const KitchenStationManagementModal: React.FC<KitchenStationManagementModalProps> = ({ stations, onSave, onClose }) => {
    const [localStations, setLocalStations] = useState<KitchenStation[]>(JSON.parse(JSON.stringify(stations)));
    const [name, setName] = useState('');
    const [color, setColor] = useState('#EF4444');

    const handleAdd = () => {
        if (!name.trim()) return;
        const newStation: KitchenStation = {
            id: Math.random().toString(36).substr(2, 9),
            name: name.trim(),
            color: color
        };
        setLocalStations([...localStations, newStation]);
        setName('');
    };

    const handleDelete = (id: string) => {
        if (localStations.length <= 1 && id === 'general') {
            alert("No se puede eliminar la estación general.");
            return;
        }
        setLocalStations(localStations.filter(s => s.id !== id));
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4" onClick={onClose}>
            <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">Estaciones de Cocina</h2>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Configura tus áreas de trabajo</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto">
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Nombre (ej: Plancha)"
                                className="flex-1 p-3 bg-gray-50 border-2 border-transparent focus:border-red-500 rounded-xl font-bold outline-none"
                            />
                            <input
                                type="color"
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                className="w-12 h-12 p-1 bg-white border rounded-xl cursor-pointer"
                            />
                            <button
                                onClick={handleAdd}
                                className="px-4 bg-gray-900 text-white rounded-xl font-black uppercase text-xs"
                            >
                                Añadir
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        {localStations.map(station => (
                            <div key={station.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: station.color }} />
                                    <span className="font-bold text-gray-800 uppercase text-sm">{station.name}</span>
                                </div>
                                <button
                                    onClick={() => handleDelete(station.id)}
                                    className="p-2 text-gray-300 hover:text-red-500"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 flex gap-4">
                    <button onClick={onClose} className="flex-1 py-4 font-black text-gray-400 uppercase tracking-widest text-xs">Cancelar</button>
                    <button onClick={() => onSave(localStations)} className="flex-[2] py-4 bg-red-600 text-white font-black uppercase tracking-widest text-sm rounded-2xl shadow-xl shadow-red-100 active:scale-95 transition-all">Guardar Estaciones</button>
                </div>
            </div>
        </div>
    );
};

export default KitchenStationManagementModal;
