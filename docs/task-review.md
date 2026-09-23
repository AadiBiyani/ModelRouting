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

The tests intentionally cover selected behavior rather than all possible inputs. In particular, the CSV task assumes valid input and one line. The palindrome tests check behavior, not whether the implementation actually uses less memory; inspect that generated code separately when discussing refactoring success.
