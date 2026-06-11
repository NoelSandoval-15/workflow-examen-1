const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

async function testUpload() {
  const form = new FormData();
  form.append('file', fs.createReadStream(path.join(__dirname, 'package.json')));
  form.append('procesoInstanciaId', 'TRM-XXXX');
  form.append('descripcion', 'test');

  try {
    const fetch = (await import('node-fetch')).default;
    const res = await fetch('http://localhost:8080/api/archivos/subir', {
      method: 'POST',
      body: form,
      headers: {
        'Authorization': 'Bearer 1234' // just something to pass auth if needed, but the endpoint might require valid jwt!
      }
    });
    const text = await res.text();
    console.log(res.status, text);
  } catch(e) {
    console.error(e);
  }
}
testUpload();
