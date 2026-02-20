# NumPy Array Basics

## Creating Arrays

```python
import numpy as np

# From list
arr = np.array([1, 2, 3, 4, 5])

# Zeros
zeros = np.zeros((3, 3))

# Ones
ones = np.ones((2, 4))

# Range
range_arr = np.arange(0, 10, 2)

# Linspace
linspace_arr = np.linspace(0, 1, 5)
```

## Array Operations

```python
# Element-wise operations
a = np.array([1, 2, 3])
b = np.array([4, 5, 6])

# Addition
c = a + b  # [5, 7, 9]

# Multiplication
d = a * b  # [4, 10, 18]

# Dot product
dot = np.dot(a, b)  # 32
```

## Indexing and Slicing

```python
arr = np.array([0, 1, 2, 3, 4, 5])

# Single element
arr[0]  # 0

# Slice
arr[1:4]  # [1, 2, 3]

# Boolean indexing
arr[arr > 2]  # [3, 4, 5]
```

## Shape Manipulation

```python
# Reshape
arr = np.arange(12)
reshaped = arr.reshape(3, 4)

# Transpose
transposed = reshaped.T

# Flatten
flattened = reshaped.flatten()
```
