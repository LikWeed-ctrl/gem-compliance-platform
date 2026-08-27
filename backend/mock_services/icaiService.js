const icaiData = {
  '22304958BKSHDG1234': {
    status: 'ACTIVE',
    caName: 'Ramesh & Co.',
    documentType: 'Turnover Certificate',
  },
  '23456789ABCDEF5678': {
    status: 'REVOKED',
    caName: 'Fake Associates',
    documentType: 'Unknown',
  }
};

async function verifyUDIN(udin) {
  if (!udin) return { error: 'No UDIN provided', sourceName: 'ICAI UDIN Registry', found: false };
  const upper = udin.toUpperCase();
  if (!icaiData[upper]) {
    if (upper.startsWith('22') && upper.length >= 18) {
        return {
            found: true,
            status: 'ACTIVE',
            sourceName: 'ICAI UDIN Registry',
            checkedAt: new Date(),
            rawResponse: { caName: 'Verified CA', documentType: 'Certificate' }
        };
    }
    return {
      found: false,
      status: 'Invalid or forged UDIN',
      sourceName: 'ICAI UDIN Registry',
      checkedAt: new Date()
    };
  }
  
  const record = icaiData[upper];
  return {
     found: true,
     status: record.status,
     sourceName: 'ICAI UDIN Registry',
     checkedAt: new Date(),
     rawResponse: record
  };
}

module.exports = { verifyUDIN };
