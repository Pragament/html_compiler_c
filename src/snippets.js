/**
 * Educational C Code Snippets Library
 * Categories: Basics, Variables, Loops, Arrays, Functions, Pointers, Structures, File I/O
 */

export const CATEGORIES = [
  'All',
  'Basics',
  'Variables',
  'Loops',
  'Arrays',
  'Functions',
  'Pointers',
  'Structures',
  'File I/O'
];

export const SNIPPETS = [
  {
    id: 'hello-world',
    title: 'Hello, World!',
    category: 'Basics',
    description: 'The classic starting point for every C programmer.',
    code: `#include <stdio.h>\n\nint main() {\n    printf("Hello, World from the Browser!\\n");\n    return 0;\n}`
  },
  {
    id: 'data-types',
    title: 'Data Types & Sizeof',
    category: 'Basics',
    description: 'Check the memory footprint of primitive C data types.',
    code: `#include <stdio.h>\n\nint main() {\n    printf("Size of char: %lu bytes\\n", sizeof(char));\n    printf("Size of int: %lu bytes\\n", sizeof(int));\n    printf("Size of float: %lu bytes\\n", sizeof(float));\n    printf("Size of double: %lu bytes\\n", sizeof(double));\n    return 0;\n}`
  },
  {
    id: 'variables-scope',
    title: 'Scope & Static Constants',
    category: 'Variables',
    description: 'Understand local vs static variables and read-only constants.',
    code: `#include <stdio.h>\n\nvoid counter() {\n    static int count = 0; // Retains value across function calls\n    count++;\n    printf("Counter value: %d\\n", count);\n}\n\nint main() {\n    const double PI = 3.14159;\n    printf("Constant PI = %.5f\\n", PI);\n    counter();\n    counter();\n    counter();\n    return 0;\n}`
  },
  {
    id: 'for-loop',
    title: 'For Loop Accumulator',
    category: 'Loops',
    description: 'Calculate the sum of numbers from 1 to 10 using a for loop.',
    code: `#include <stdio.h>\n\nint main() {\n    int sum = 0;\n    for (int i = 1; i <= 10; i++) {\n        sum += i;\n    }\n    printf("Sum of numbers 1 to 10 is: %d\\n", sum);\n    return 0;\n}`
  },
  {
    id: 'while-loop',
    title: 'While Loop Countdown',
    category: 'Loops',
    description: 'Demonstrating while loop condition evaluation and countdown.',
    code: `#include <stdio.h>\n\nint main() {\n    int count = 5;\n    printf("Starting countdown:\\n");\n    while (count > 0) {\n        printf("T-minus %d...\\n", count);\n        count--;\n    }\n    printf("Liftoff!\\n");\n    return 0;\n}`
  },
  {
    id: 'array-reversal',
    title: '1D Array Reversal',
    category: 'Arrays',
    description: 'Traverse and reverse an integer array in place.',
    code: `#include <stdio.h>\n\nint main() {\n    int arr[5] = {10, 20, 30, 40, 50};\n    int n = 5;\n    printf("Original array: ");\n    for(int i = 0; i < n; i++) printf("%d ", arr[i]);\n    printf("\\n");\n    \n    for(int i = 0; i < n / 2; i++) {\n        int temp = arr[i];\n        arr[i] = arr[n - 1 - i];\n        arr[n - 1 - i] = temp;\n    }\n    \n    printf("Reversed array: ");\n    for(int i = 0; i < n; i++) printf("%d ", arr[i]);\n    printf("\\n");\n    return 0;\n}`
  },
  {
    id: 'matrix-multiplication',
    title: '2D Matrix Multiplication',
    category: 'Arrays',
    description: 'Multiply two 2x2 matrices and print the resulting matrix.',
    code: `#include <stdio.h>\n\nint main() {\n    int a[2][2] = {{1, 2}, {3, 4}};\n    int b[2][2] = {{2, 0}, {1, 2}};\n    int c[2][2] = {0};\n    \n    for(int i = 0; i < 2; i++) {\n        for(int j = 0; j < 2; j++) {\n            for(int k = 0; k < 2; k++) {\n                c[i][j] += a[i][k] * b[k][j];\n            }\n        }\n    }\n    \n    printf("Result matrix:\\n");\n    for(int i = 0; i < 2; i++) {\n        for(int j = 0; j < 2; j++) {\n            printf("%d ", c[i][j]);\n        }\n        printf("\\n");\n    }\n    return 0;\n}`
  },
  {
    id: 'recursive-fibonacci',
    title: 'Recursive Fibonacci',
    category: 'Functions',
    description: 'Calculate the nth Fibonacci number using recursion.',
    code: `#include <stdio.h>\n\nint fibonacci(int n) {\n    if (n <= 1) return n;\n    return fibonacci(n - 1) + fibonacci(n - 2);\n}\n\nint main() {\n    int terms = 8;\n    printf("Fibonacci sequence up to %d terms:\\n", terms);\n    for(int i = 0; i < terms; i++) {\n        printf("%d ", fibonacci(i));\n    }\n    printf("\\n");\n    return 0;\n}`
  },
  {
    id: 'pointer-arithmetic',
    title: 'Pointer Arithmetic',
    category: 'Pointers',
    description: 'Traverse array elements using memory addresses.',
    code: `#include <stdio.h>\n\nint main() {\n    int values[4] = {100, 200, 300, 400};\n    int *ptr = values;\n    \n    for (int i = 0; i < 4; i++) {\n        printf("Address: %p | Value at ptr + %d: %d\\n", (void*)(ptr + i), i, *(ptr + i));\n    }\n    return 0;\n}`
  },
  {
    id: 'struct-student',
    title: 'Student Structure Record',
    category: 'Structures',
    description: 'Create and manipulate structured user-defined records.',
    code: `#include <stdio.h>\n\nstruct Student {\n    int id;\n    float gpa;\n};\n\nint main() {\n    struct Student s1 = {101, 3.85};\n    struct Student s2 = {102, 3.92};\n    \n    printf("Student ID: %d | GPA: %.2f\\n", s1.id, s1.gpa);\n    printf("Student ID: %d | GPA: %.2f\\n", s2.id, s2.gpa);\n    return 0;\n}`
  },
  {
    id: 'file-io',
    title: 'Virtual File Read/Write',
    category: 'File I/O',
    description: 'Create a file in WASM memory, write data, and read it back.',
    code: `#include <stdio.h>\n\nint main() {\n    FILE *fp = fopen("demo.txt", "w");\n    if (fp == NULL) {\n        printf("Failed to create file.\\n");\n        return 1;\n    }\n    fprintf(fp, "Hello from virtual WASM filesystem!\\n");\n    fclose(fp);\n    \n    fp = fopen("demo.txt", "r");\n    char buffer[100];\n    if (fgets(buffer, sizeof(buffer), fp) != NULL) {\n        printf("Read from demo.txt: %s", buffer);\n    }\n    fclose(fp);\n    return 0;\n}`
  }
];

/**
 * Filter snippets by category and/or search query string.
 * @param {string} category - The selected category or 'All'
 * @param {string} query - The search string
 * @returns {Array} Filtered snippets
 */
export function getFilteredSnippets(category = 'All', query = '') {
  const cleanQuery = query.trim().toLowerCase();
  return SNIPPETS.filter((s) => {
    const matchesCategory = category === 'All' || s.category === category;
    const matchesQuery = !cleanQuery ||
      s.title.toLowerCase().includes(cleanQuery) ||
      s.description.toLowerCase().includes(cleanQuery);
    return matchesCategory && matchesQuery;
  });
}
