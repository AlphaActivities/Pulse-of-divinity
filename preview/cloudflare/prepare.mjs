import {readFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
if(createHash('sha256').update(readFileSync('baseline.tar.gz')).digest('hex') !== 'b245e761e83c7198492aa2e546ad2cc55e3ed79f06602c5b932a843246b3c6d9') throw Error('Baseline checksum mismatch');
mkdirSync('baseline',{recursive:true});
execFileSync('tar',['-xzf','baseline.tar.gz','-C','baseline']);
