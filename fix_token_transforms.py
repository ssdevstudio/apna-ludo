import re

with open('client/src/App.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Fix track tokens offset
code = code.replace(
    'if (count === 1) return { transform: 	ranslate(-50%, -50%)  };',
    'if (count === 1) return { transform: 	ranslate(-50%, -80%)  };'
)
code = code.replace(
    'return { transform: 	ranslate(calc(-50% + %), calc(-50% + %)) scale(0.8)  };',
    'return { transform: 	ranslate(calc(-50% + %), calc(-80% + %)) scale(0.8)  };'
)
code = code.replace(
    'return { transform: 	ranslate(calc(-50% + %), calc(-50% + %)) scale(0.75)  };',
    'return { transform: 	ranslate(calc(-50% + %), calc(-80% + %)) scale(0.75)  };'
)
code = code.replace(
    'return { transform: 	ranslate(calc(-50% + %), calc(-50% + %)) scale(0.6)  };',
    'return { transform: 	ranslate(calc(-50% + %), calc(-80% + %)) scale(0.6)  };'
)

# Fix yard token offset
code = code.replace(
    'transform = 	ranslate(-50%, -50%) rotate(-deg);',
    'transform = 	ranslate(-50%, -80%) rotate(-deg);'
)

with open('client/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print('Token transforms fixed')
