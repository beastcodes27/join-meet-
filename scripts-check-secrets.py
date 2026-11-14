#!/usr/bin/env python3
"""Scan every reachable Git commit for common credentials and sensitive filenames."""
import re, subprocess, sys
from pathlib import PurePosixPath
patterns = [rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',rb'gh[pousr]_[A-Za-z0-9]{30,}',rb'github_pat_[A-Za-z0-9_]{40,}',rb'AIza[0-9A-Za-z_-]{30,}',rb'"private_key"\s*:\s*"[^"\s]+']
assignment = re.compile(rb'^(?:APP_KEY|LIVEKIT_API_KEY|LIVEKIT_API_SECRET|REDIS_PASSWORD|DB_PASSWORD|FIREBASE_CREDENTIALS|VITE_FIREBASE_API_KEY)[ \t]*=[ \t]*([^\r\n]*)$',re.M)
failed = False
for revision in subprocess.check_output(['git','rev-list','--all'],text=True).splitlines():
    for line in subprocess.check_output(['git','ls-tree','-r',revision],text=True).splitlines():
        metadata,path = line.split('\t',1)
        name = PurePosixPath(path).name
        sensitive = (name == '.env' or (name.startswith('.env.') and name != '.env.example') or name.endswith(('.pem','.key','.sqlite','.sqlite3')) or 'service-account' in name or 'firebase-adminsdk' in name)
        if sensitive:
            print('Sensitive tracked path:',path,'in',revision[:12]); failed=True
        blob = subprocess.check_output(['git','cat-file','blob',metadata.split()[2]])
        hits = any(re.search(pattern,blob) for pattern in patterns)
        for value in assignment.findall(blob):
            value=value.strip().strip(b'"\'')
            if value and value.lower() not in (b'null', b'none') and not value.startswith((b'${',b'$')):
                hits=True
        if hits:
            print('Potential credential in:',path,'in',revision[:12]); failed=True
if failed:
    print('Review detected paths before pushing. Secret values are deliberately not printed.');sys.exit(1)
print('No common credential patterns or sensitive tracked filenames found in Git history.')
