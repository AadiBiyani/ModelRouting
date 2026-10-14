# Task review

These task prompts and tests were prepared before running model-generated code. A reviewer should check that each expected output follows from its prompt before the benchmark starts.

| Task | Category | Cases checked |
| --- | --- | --- |
| unique-numbers | implement | Empty input, duplicates, negatives and zero, order, no mutation |
| merge-sorted | implement | Empty inputs, interleaving, duplicates, negatives, no mutation |
| normalize-whitespace | implement | Empty input, trimming, mixed whitespace runs, unchanged normalized input |
| parse-csv-line | implement | Plain fields, empty fields, quoted commas, doubled quotes, whitespace |
| top-k-frequent | implement | Empty input, zero k, frequency order, first-appearance tie break, large k, no mutation |
| count-words | debug | Empty and whitespace-only input, repeated spaces, tabs, line breaks |
| is-palindrome | refactor | Mixed case and punctuation, non-palindrome, digits, empty normalized input |
| fibonacci-long-context | implement | Zero count, single value, seed values, first ten numbers, twentieth number |
| evaluate-expression | implement | Precedence, left-associative `-` and `/`, right-associative `^`, `^` before unary minus, unary minus in operands, decimals and whitespace, invalid input |
| chunk-array | debug | Shorter final group, even split, size larger than input, size one, empty input, no mutation |
| flatten-nested | refactor | Left-to-right order, empty arrays, no mutation, 100,000 levels of nesting |

The tests intentionally cover selected behavior rather than all possible inputs. In particular, the CSV task assumes valid input and one line. The palindrome tests check behavior, not whether the implementation actually uses less memory; inspect that generated code separately when discussing refactoring success.

The last four tasks were added to separate routing signals from actual difficulty:

- `fibonacci-long-context` is a simple implementation whose input includes an unrelated 6,781-character supporting module. Its 7,350-character input exceeds `MAX_LOCAL_CHARS`, so it tests whether input length alone predicts difficulty.
- `evaluate-expression` is a short implementation task with many interacting rules. It is expected to be hard for a small local model even though it routes locally.
- `chunk-array` and `flatten-nested` are a single-bug fix and a simple refactor that a local model is expected to handle, although they route to the cloud by kind. The deep-nesting test makes the refactoring goal checkable: the original recursive version overflows the call stack. The evaluator tests check exact results only for values that are exactly representable, so floating-point formatting does not affect them.

Each new task was checked before any model run: a reference solution passes, and the original code (for the debug and refactor tasks) or a known incorrect variant fails. Results from benchmark runs before a task was added are not comparable with later runs.
