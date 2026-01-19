import { Branch } from './types';

export const ORGANIGRAMA: Record<Branch, string[]> = {
    'Eléctrica': ['Powertrain', 'Diseño', 'Telemetría'],
    'Mecánica': ['Dinámica', 'Parte Ciclo', 'Chasis', 'Anclajes', 'Carenado'],
    'Administración': ['MS1', 'Logística', 'RR.EE', 'G.E', 'Media'],
    'General': ['Coordinación']
};

// Uses Cloudflare IPFS (Correct Images CID, No Extension)
export const getRandomAvatar = () => {
    // 0 to 9999
    const randomId = Math.floor(Math.random() * 10000);
    return `https://cloudflare-ipfs.com/ipfs/QmRRPWG96cmgTn2qSzjwr2qvfNEuhIUfsppMynagfW6xS/${randomId}`;
};
