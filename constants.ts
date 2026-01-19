import { Branch } from './types';

export const ORGANIGRAMA: Record<Branch, string[]> = {
    'Eléctrica': ['Powertrain', 'Diseño', 'Telemetría'],
    'Mecánica': ['Dinámica', 'Parte Ciclo', 'Chasis', 'Anclajes', 'Carenado'],
    'Administración': ['MS1', 'Logística', 'RR.EE', 'G.E', 'Media'],
    'General': ['Coordinación']
};

export const BAYC_IPFS_CID = 'QmRRPWG96cmgTn2qSzjdaXB3tQZ9rnf2Qq5I8fE5gC0';
// Uses DiceBear API for instant, reliable robot avatars
export const getRandomAvatar = () => {
    const randomSeed = Math.random().toString(36).substring(7);
    return `https://api.dicebear.com/9.x/bottts/svg?seed=${randomSeed}`;
};
