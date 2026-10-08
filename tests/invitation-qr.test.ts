import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';
import { decodeInvitationQrImage, parseInvitationQr } from '../src/community/invitationQr.ts';

const code = 'DME2M8Z4PFA6GF89';
const production = 'https://lacantera.web.app';
const link = `${production}/#/invite/${code}`;

// qrcode.react produces axis-aligned horizontal module strips. Rasterize that
// generated SVG only in tests, avoiding DOM, image downloads and new libraries.
function qrPixels(value: string, scale = 8) {
  const svg = renderToStaticMarkup(createElement(QRCodeSVG, { value, marginSize: 4, level: 'M' }));
  const viewBox = /viewBox="0 0 (\d+) (\d+)"/.exec(svg)!;
  const modules = Number(viewBox[1]); assert.equal(viewBox[1], viewBox[2]);
  const path = /<path fill="#000000" d="([^"]+)"/.exec(svg)![1];
  const strip = /M(\d+)[ ,](\d+)\s*h(\d+)v1H(\d+)z/g;
  assert.equal(path.replace(strip, ''), '');
  const width = modules * scale;
  const data = new Uint8ClampedArray(width * width * 4).fill(255);
  for (const match of path.matchAll(strip)) {
    const x = Number(match[1]), y = Number(match[2]), length = Number(match[3]);
    assert.equal(Number(match[4]), x);
    for (let row = y * scale; row < (y + 1) * scale; row++) for (let column = x * scale; column < (x + length) * scale; column++) {
      const index = (row * width + column) * 4;
      data[index] = data[index + 1] = data[index + 2] = 0;
    }
  }
  return { data, width, height: width };
}

test('lector acepta códigos legibles y sólo enlaces exactos de Cantera o su origen actual', () => {
  assert.equal(parseInvitationQr(code), code);
  assert.equal(parseInvitationQr('dme2 m8z4 pfa6 gf89'), code);
  assert.equal(parseInvitationQr('DME2-M8Z4-PFA6-GF89'), code);
  assert.equal(parseInvitationQr(link), code);
  assert.equal(parseInvitationQr(`${production}/#/invite/${code.toLowerCase()}`), code);
  assert.equal(parseInvitationQr(`http://localhost:3000/#/invite/${code}`, 'http://localhost:3000'), code);
  assert.equal(parseInvitationQr(`https://cantera-preview.example.test/#/invite/${code}`, 'https://cantera-preview.example.test'), code);
  assert.equal(parseInvitationQr(link, 'http://localhost:3000'), code);
});

test('rechaza QR de otros dominios, puertos, protocolos, credenciales y orígenes aparentes', () => {
  for (const url of [
    `https://other.example.test/#/invite/${code}`, `http://lacantera.web.app/#/invite/${code}`,
    `https://lacantera.web.app.evil.test/#/invite/${code}`, `https://lacantera.web.app:444/#/invite/${code}`,
    `https://lacantera.web.app./#/invite/${code}`, `https://lacantera.web.app@evil.test/#/invite/${code}`,
    `https://evil.test@lacantera.web.app/#/invite/${code}`, `https://user:secret@lacantera.web.app/#/invite/${code}`,
    `javascript:${link}`, `data:text/plain,${link}`, `ftp://lacantera.web.app/#/invite/${code}`, `//lacantera.web.app/#/invite/${code}`,
    `https://lаcantera.web.app/#/invite/${code}`, `https://ｌacantera.web.app/#/invite/${code}`, `https://%6cacantera.web.app/#/invite/${code}`,
    `https://lacantera.web.app\\@evil.test/#/invite/${code}`, `https:////lacantera.web.app/#/invite/${code}`,
    `http://localhost:3001/#/invite/${code}`,
  ]) assert.equal(parseInvitationQr(url, 'http://localhost:3000'), null, url);
  assert.equal(parseInvitationQr(`https://other.example.test/#/invite/${code}`, 'https://user:secret@other.example.test'), null);
  assert.equal(parseInvitationQr(`https://other.example.test/#/invite/${code}`, 'https://other.example.test/path'), null);
  assert.equal(parseInvitationQr(`https://other.example.test/#/invite/${code}`, 'https://other.example.test/'), null);
});

test('rechaza rutas, consultas, controles, escapes y código incrustado en contenido ajeno', () => {
  for (const value of [
    `${production}/invite/${code}`, `${production}/app/#/invite/${code}`, `${production}/./#/invite/${code}`,
    `${production}/foo/../#/invite/${code}`, `${production}//#/invite/${code}`, `${production}/?redirect=1#/invite/${code}`,
    `${link}?redirect=https://evil.test`, `${link}/`, `${link}#more`, `${production}/#/invite/${code.slice(1)}`,
    `${production}/#/invite/${code}2`, `${production}/#/invite/DME1M8Z4PFA6GF89`, `${production}/#/invite/${encodeURIComponent('DME2 M8Z4 PFA6 GF89')}`,
    `${production}/#/invite/%44ME2M8Z4PFA6GF89`, ` ${link}`, `${link}\n`, `${production}/\t#/invite/${code}`,
    `#/invite/${code}`, `Aquí tienes tu invitación: ${link}`, '', ' '.repeat(3000), '<script>alert(1)</script>',
  ]) assert.equal(parseInvitationQr(value), null, value);
  assert.equal(parseInvitationQr(null as unknown as string), null);
});

test('decodifica un QR real de qrcode.react y entrega sólo código tras validar el payload', () => {
  for (const payload of [code, link]) {
    const image = qrPixels(payload);
    const decoded = decodeInvitationQrImage(image.data, image.width, image.height);
    assert.equal(decoded, payload);
    assert.equal(parseInvitationQr(decoded!), code);
  }
});

test('reconoce QR invertido y rotado sin depender de BarcodeDetector o servicios externos', () => {
  const image = qrPixels(link);
  const inverted = new Uint8ClampedArray(image.data);
  for (let index = 0; index < inverted.length; index += 4) for (let channel = 0; channel < 3; channel++) inverted[index + channel] = 255 - inverted[index + channel];
  assert.equal(decodeInvitationQrImage(inverted, image.width, image.height), link);
  const rotated = new Uint8ClampedArray(image.data.length);
  for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
    const source = (y * image.width + x) * 4;
    const target = (x * image.width + image.width - 1 - y) * 4;
    rotated.set(image.data.subarray(source, source + 4), target);
  }
  assert.equal(decodeInvitationQrImage(rotated, image.width, image.height), link);
});

test('un QR externo puede decodificarse pero no autoriza navegación ni entrada a Cantera', () => {
  const external = `https://foreign.example.test/#/invite/${code}`;
  const image = qrPixels(external);
  const raw = decodeInvitationQrImage(image.data, image.width, image.height);
  assert.equal(raw, external);
  assert.equal(parseInvitationQr(raw!, production), null);
});

test('no decodifica datos incompletos, tamaños desmesurados ni imágenes sin QR', () => {
  for (const [width, height] of [[0, 100], [-1, 100], [1.5, 100], [NaN, 100], [100, Infinity], [2049, 10], [10, 2049], [Number.MAX_SAFE_INTEGER, 1]]) {
    assert.equal(decodeInvitationQrImage(new Uint8ClampedArray(4), width, height), null);
  }
  assert.equal(decodeInvitationQrImage(new Uint8ClampedArray(399), 10, 10), null);
  assert.equal(decodeInvitationQrImage(new Uint8ClampedArray(404), 10, 10), null);
  assert.equal(decodeInvitationQrImage(new Uint8Array(400) as unknown as Uint8ClampedArray, 10, 10), null);
  assert.equal(decodeInvitationQrImage(null as unknown as Uint8ClampedArray, 10, 10), null);
  assert.equal(decodeInvitationQrImage(new Uint8ClampedArray(80 * 100 * 4).fill(255), 80, 100), null);
  assert.equal(decodeInvitationQrImage(new Uint8ClampedArray(80 * 100 * 4), 80, 100), null);
});
