#!/usr/bin/env python3
import sys
import json

critical_found = False
for line in sys.stdin:
    try:
        obj = json.loads(line)
        if obj.get('type') == 'auditAdvisory':
            adv = obj['data']['advisory']
            if adv['severity'] == 'critical':
                critical_found = True
                print(f"\nCRITICAL: {adv['module_name']} - {adv['title']}")
                print(f"  URL: {adv['url']}")
                print(f"  Patched: {adv['patched_versions']}")
                print(f"  Recommendation: {adv.get('recommendation', 'N/A')}")
    except Exception:
        continue

if critical_found:
    print("\nOne or more critical vulnerabilities found! Failing job.")
    sys.exit(1)
else:
    print("No critical vulnerabilities found.")
    sys.exit(0)
