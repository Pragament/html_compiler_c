import JSCPP from 'JSCPP';

function runJSCPP(code, stdin = '') {
  let stdout = '';
  let stderr = '';
  let exitCode = 0;
  let success = true;

  const config = {
    stdio: {
      write: (s) => {
        stdout += s;
      }
    },
    unsigned_overflow: 'error'
  };

  try {
    const result = JSCPP.run(code, stdin, config);
    if (typeof result === 'number') {
      exitCode = result;
    } else if (result !== undefined && result !== null) {
      exitCode = Number(result) || 0;
    } else {
      exitCode = 0;
    }
    if (exitCode !== 0) {
      success = false;
    }
  } catch (err) {
    stderr = err.message || String(err);
    exitCode = 1;
    success = false;
  }

  return { success, stdout, stderr, exitCode };
}

console.log('=== Running JSCPP Single-Runtime Verification Suite ===\n');

const tests = [
  {
    name: '1. printf support',
    code: `#include <stdio.h>\nint main() { printf("Hello JSCPP\\n"); return 0; }`,
    expected: 'Hello JSCPP\n'
  },
  {
    name: '2. Variables & Local variables',
    code: `#include <stdio.h>\nint main() { int a = 10; int b = 25; printf("%d", a + b); return 0; }`,
    expected: '35'
  },
  {
    name: '3. Arithmetic',
    code: `#include <stdio.h>\nint main() { int x = (20 - 5) * 2 / 3 + 10 % 3; printf("%d", x); return 0; }`,
    expected: '11'
  },
  {
    name: '4. if / else',
    code: `#include <stdio.h>\nint main() { int n = 42; if (n > 50) printf("High"); else if (n == 42) printf("Exact"); else printf("Low"); return 0; }`,
    expected: 'Exact'
  },
  {
    name: '5. for loops',
    code: `#include <stdio.h>\nint main() { int sum = 0; for (int i = 1; i <= 5; i++) { sum += i; } printf("%d", sum); return 0; }`,
    expected: '15'
  },
  {
    name: '6. while loops',
    code: `#include <stdio.h>\nint main() { int count = 3; while (count > 0) { printf("%d ", count); count--; } return 0; }`,
    expected: '3 2 1 '
  },
  {
    name: '7. do while',
    code: `#include <stdio.h>\nint main() { int x = 0; do { x += 5; } while (x < 15); printf("%d", x); return 0; }`,
    expected: '15'
  },
  {
    name: '8. switch',
    code: `#include <stdio.h>\nint main() { int opt = 2; switch(opt) { case 1: printf("One"); break; case 2: printf("Two"); break; default: printf("Other"); } return 0; }`,
    expected: 'Two'
  },
  {
    name: '9. Functions',
    code: `#include <stdio.h>\nint add(int a, int b) { return a + b; }\nint main() { printf("%d", add(100, 200)); return 0; }`,
    expected: '300'
  },
  {
    name: '10. Recursion',
    code: `#include <stdio.h>\nint fact(int n) { if (n <= 1) return 1; return n * fact(n - 1); }\nint main() { printf("%d", fact(5)); return 0; }`,
    expected: '120'
  },
  {
    name: '11. Arrays',
    code: `#include <stdio.h>\nint main() { int arr[4] = {10, 20, 30, 40}; int sum = 0; for (int i = 0; i < 4; i++) sum += arr[i]; printf("%d", sum); return 0; }`,
    expected: '100'
  },
  {
    name: '12. Pointers',
    code: `#include <stdio.h>\nvoid increment(int *ptr) { (*ptr) += 10; }\nint main() { int val = 50; increment(&val); printf("%d", val); return 0; }`,
    expected: '60'
  },
  {
    name: '13. Nested loops',
    code: `#include <stdio.h>\nint main() { int c = 0; for (int i = 0; i < 3; i++) { for (int j = 0; j < 4; j++) { c++; } } printf("%d", c); return 0; }`,
    expected: '12'
  }
];

let failed = 0;
for (const t of tests) {
  const res = runJSCPP(t.code);
  if (!res.success || res.stdout !== t.expected) {
    console.error(`❌ [FAIL] ${t.name}`);
    console.error(`   Expected stdout: '${t.expected}'`);
    console.error(`   Got stdout:      '${res.stdout}'`);
    if (res.stderr) console.error(`   Got stderr:      '${res.stderr}'`);
    failed++;
  } else {
    console.log(`✅ [PASS] ${t.name}`);
  }
}

if (failed > 0) {
  console.error(`\n❌ ${failed} test(s) failed.`);
  process.exit(1);
} else {
  console.log(`\n🎉 ALL ${tests.length} JSCPP FEATURE TESTS PASSED SUCCESSFULLY!`);
}
