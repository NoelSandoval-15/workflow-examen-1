const fs = require('fs');

async function testUpload() {
  const form = new FormData();
  const fileBlob = new Blob([fs.readFileSync('package.json')], { type: 'application/json' });
  form.append('file', fileBlob, 'package.json');
  form.append('procesoInstanciaId', 'TRM-XXXX');

  try {
    const res = await fetch('http://localhost:8080/api/archivos/subir', {
      method: 'POST',
      body: form,
      // No mandamos auth, si requiere Auth, nos dará 401/403. Si nos da 500 es que saltó el filtro o falló igual.
    });
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Body:", text);
  } catch(e) {
    console.error(e);
  }
}
testUpload();
