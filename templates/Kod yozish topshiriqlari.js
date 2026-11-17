window.CodeWritingTasks={
  'ikki-son-yigindisi':{
    title:'Ikki son yig‘indisi',
    level:'Boshlang‘ich',
    topic:'Ikkita butun son yig‘indisini hisoblash',
    functionName:'Natija = a + b',
    description:'Ikkita butun son beriladi. Ularning yig‘indisini hisoblab, natijani ekranga chiqaring.',
    input:'Bitta qatorda ikkita butun son beriladi.',
    output:'Ikki sonning yig‘indisini chiqaring.',
    sampleInput:'4 7',
    sampleOutput:'11',
    starterCode:{
      python:'a, b = map(int, input().split())\n\n# Yig‘indini hisoblang va chiqaring\n',
      javascript:'const fs = require("fs");\nconst [a, b] = fs.readFileSync(0, "utf8").trim().split(/\\s+/).map(Number);\n\n// Yig‘indini hisoblang va chiqaring\n',
      cpp:'#include <iostream>\nusing namespace std;\n\nint main() {\n    int a, b;\n    cin >> a >> b;\n    // Yig‘indini hisoblang va chiqaring\n    return 0;\n}\n',
      java:'import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        int a = scanner.nextInt();\n        int b = scanner.nextInt();\n        // Yig‘indini hisoblang va chiqaring\n    }\n}\n'
    }
  }
};
