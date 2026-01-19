import { Branch } from './types';

export const ORGANIGRAMA: Record<Branch, string[]> = {
    'Eléctrica': ['Powertrain', 'Diseño', 'Telemetría'],
    'Mecánica': ['Dinámica', 'Parte Ciclo', 'Chasis', 'Anclajes', 'Carenado'],
    'Administración': ['MS1', 'Logística', 'RR.EE', 'G.E', 'Media'],
    'General': ['Coordinación']
};

export const BAYC_IPFS_CID = 'QmRRPWG96cmgTn2qSzjdaXB3tQZ9rnf2Qq5I8fE5gC0';
export const getRandomApe = () => {
    // There are 10,000 apes (0-9999). We act like we own them all (spectator fun).
    const randomId = Math.floor(Math.random() * 10000);
    // Uses Pinata IPFS gateway for maximum reliability
    return `https://gateway.pinata.cloud/ipfs/${BAYC_IPFS_CID}/${randomId}.png`;
};
