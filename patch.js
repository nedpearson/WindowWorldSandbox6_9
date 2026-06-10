const fs = require('fs');

let content = fs.readFileSync('apps/web/src/pages/AppointmentDetailPage.tsx', 'utf8');

// 1. Replace upd and saveCustomer definition
const originalDef = `  const [c, setC] = useState(appt.customer);
  const upd = (f: string, v: any) => setC({ ...c, [f]: v });

  const saveCustomer = async () => {
    try {
      await api.updateCustomer(c.id, c);
      if (onCustomerUpdated) onCustomerUpdated(c);
    } catch (e) { console.debug("[swallowed error]", e); }
  };`;

const newDef = `  const [c, setC] = useState(appt.customer);

  const saveCustomer = async (currentC: any) => {
    try {
      await api.updateCustomer(currentC.id, currentC);
      if (onCustomerUpdated) onCustomerUpdated(currentC);
    } catch (e) { console.debug("[swallowed error]", e); }
  };

  const upd = (f: string, v: any, save = false) => {
    const newC = { ...c, [f]: v };
    setC(newC);
    if (save) saveCustomer(newC);
  };`;

content = content.replace(originalDef, newDef);

// 2. Replace onBlur={saveCustomer} with onBlur={(e) => upd(e.target.name || f, e.target.value, true)}
const regex = /onChange=\{\(e\) => upd\("([^"]+)", e\.target\.value\)\}\s+onBlur=\{saveCustomer\}/g;
content = content.replace(regex, 'onChange={(e) => upd("$1", e.target.value)}\n            onBlur={(e) => upd("$1", e.target.value, true)}');

// 3. Replace JobStep upd and onSave
const originalJobDef = `  const [a, setA] = useState(appt);
  const upd = (f: string, v: any) => {
    const n = { ...a, [f]: v };
    setA(n);
  };`;

const newJobDef = `  const [a, setA] = useState(appt);
  const upd = (f: string, v: any, save = false) => {
    const n = { ...a, [f]: v };
    setA(n);
    if (save) {
      onSave({ [f]: v });
    }
  };`;
content = content.replace(originalJobDef, newJobDef);

// 4. Job Address special onBlur
const originalJobAddress = `onChange={(e) => upd("jobAddress", e.target.value)}
          onBlur={() =>
            onSave({
              jobAddress: a.jobAddress,
              jobCity: a.jobCity,
              jobState: a.jobState,
              jobZip: a.jobZip,
            })
          }`;
const newJobAddress = `onChange={(e) => upd("jobAddress", e.target.value)}
          onBlur={(e) => upd("jobAddress", e.target.value, true)}`;
content = content.replace(originalJobAddress, newJobAddress);

// 5. Job City/State/Zip missing onBlur
const jobFields = ['jobCity', 'jobState', 'jobZip'];
jobFields.forEach(field => {
  const r = new RegExp('onChange=\\{\\(e\\) => upd\\("' + field + '", e\\.target\\.value\\)\\}', 'g');
  content = content.replace(r, 'onChange={(e) => upd("' + field + '", e.target.value)}\n            onBlur={(e) => upd("' + field + '", e.target.value, true)}');
});

fs.writeFileSync('apps/web/src/pages/AppointmentDetailPage.tsx', content);
console.log('Successfully patched AppointmentDetailPage.tsx');
