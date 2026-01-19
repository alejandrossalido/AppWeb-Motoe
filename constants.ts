import { Branch } from './types';

export const ORGANIGRAMA: Record<Branch, string[]> = {
    'Eléctrica': ['Powertrain', 'Diseño', 'Telemetría'],
    'Mecánica': ['Dinámica', 'Parte Ciclo', 'Chasis', 'Anclajes', 'Carenado'],
    'Administración': ['MS1', 'Logística', 'RR.EE', 'G.E', 'Media'],
    'General': ['Coordinación']
};

// Uses GitHub Raw Mirror (Static HTTP) - Definitive Solution
export const getRandomAvatar = () => {
    // 1 to 9999
    const randomId = Math.floor(Math.random() * 9999) + 1;
    return `https://raw.githubusercontent.com/dli-sky/bored-ape-yacht-club-images/master/images/${randomId}.png`;
};
