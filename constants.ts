import { Branch } from './types';

export const ORGANIGRAMA: Record<Branch, string[]> = {
    'Eléctrica': ['Powertrain', 'Diseño', 'Telemetría'],
    'Mecánica': ['Dinámica', 'Parte Ciclo', 'Chasis', 'Anclajes', 'Carenado'],
    'Administración': ['MS1', 'Logística', 'RR.EE', 'G.E', 'Media'],
    'General': ['Coordinación']
};

// Uses IPFS Images CID for Bored Apes (Corrected)
export const getRandomAvatar = () => {
    // 0 to 9999
    const randomId = Math.floor(Math.random() * 10000);
    // Uses public IPFS gateway with correct Images CID.
    return `https://ipfs.io/ipfs/QmRRPWG96cmgTn2qSzjwr2qvfNEuhIUfsppMynagfW6xS/${randomId}.png`;
};
