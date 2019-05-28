# Section 1.5
This section will discuss JavaScript arrays and how to use them.

## What Are Arrays?
JavaScript arrays are, in a few words, *one* in fact, lists. Arrays store a list of data, whether it be numbers, strings or even other arrays. They are useful when you have a large number of variables that are similar in nature, like a bunch of names or fruits etc.

## How Do We Use Arrays?
In JavaScript arrays are stored in a variable. To get an item from their list we use the position of the item we want. e.g.
```
let value = myArray[2];
```

This would return the 3^(rd)^ item from the array `myArray`. the first part of this tells JavaScript to save the item we get into the variable `value`. the second part, after the `=` tells JavaScript we want to use the array stored in the variable `myArray`. Finally, the number between the square brackets `]` and `[` is the position of the element we want to get.

## Positions in JavaScript
When specifying a position in a string or array JavaScript starts counting from 0. This may seem odd at first but the best and most simple explanation is that computers work in binary, 1s and 0s. To increase efficiency computer scientists decided that starting from 0 was a better option as we were able to use all combinations of bits. Don't worry if you don't know about binary we will cover it later on. Just know this when providing a position, make sure to always start at 0. This means the 1^(st)^ item is position 0, the 2^(nd)^ is 1, the 3^(rd)^ is 2 and so on. The best way to visualise this is like this:

```
/&#42;
| 1st | 2nd | 3rd | 4th | 5th | 6th |
0     1     2     3     4     5     6

Specifying position 0 to position 3 would select:
1st, 2nd, 3rd
It would not select 4th as it selects everything between the separators.

However, specifying position 3 would give:
4th
as single positions select the item after the separator.
&#42;/
```

## Creating Arrays
Creating arrays in JavaScript is fairly simple. They are represented by square brackets (`[` and `]`) with a list of comma separated values in between.
### Example
```
let myArray = [ 1, 2, 3, 4, 5, 6, 7, 8, 9 ];
```

In this case it has made an array with the elements `1`,`2`,`3`,`4`,`5`,`6`,`7`,`8` and `9`.

Arrays can hold other values like strings:

```
let myArray = ["Apples", "Bananas", "Oranges"];
```

or they can hold multiple types within the one array, however this is not recommended.

```
let myArray = [1, "two", "three", 4, 5, "six", 7];
```

## Modifying Arrays

There are multiple ways of adding and removing values from an existing array. The most simple is the `=` operator.

```
let myArray = [1,2,3,4,5,6];
console.log(myArray);// Output: 1,2,3,4,5,6
myArray[2] = 10;
console.log(myArray);// Output: 1,2,10,4,5,6
```

Be careful though, JavaScript allows you to set an element in a position outside the initial list. e.g.

```
let myArray = [1,2,3,4,5,6];
console.log(myArray);// Output: 1,2,3,4,5,6
myArray[8] = 10;
console.log(myArray);// Output: 1,2,3,4,5,6,,,10
```

Note the repeated commas, JavaScript filled in the gap with empty values so the elements in positions 6 and 7 are now `undefined`.

This is known as "leaving holes" in JavaScript, as the value `undefined` can be seen as a hole in the array.

Another way of modifying arrays is through `push()`, `pop()`, `shift()` and `unshift()`. Their behaviours are:
- `push()`: adds an element to the end of an array.
- `pop()`: removes the last element in the array and returns the removed element.
- `unshift()`: adds an element to the start of an array.
- `shift()`: removes an element from the start of an array and returns the removed element.

### Example
```
let myArray = ["Apples", "Bananas", "Oranges"];


let lastFruit = myArray.pop();
console.log("myArray after pop(): " + myArray); // Output: myArray after pop(): Apples,Bananas
console.log("lastFruit: " + lastFruit); // Output: lastFruit: Oranges


myArray.push("Lemons");
console.log("myArray after push(): " + myArray); // Output: myArray after push(): Apples,Bananas,Lemons


let firstFruit = myArray.shift();
console.log("myArray after shift(): " + myArray); // Output: myArray after shift(): Bananas,Lemons
console.log("firstFruit: " + firstFruit); // Output: firstFruit: Apples


myArray.unshift("Apricots");
console.log("myArray after unshift(): " + myArray); // Output: myArray after unshift(): Apricots,Bananas,Lemons
```

Here we can see how `pop()`, `push()`, `shift()` and `unshift()` affect an array, as well as what `pop()` and `shift()` return. Although it is not shown here, `push()` and `unshift()` both return the length of the array after adding the new element.

## How Long?

JavaScript arrays all have a property called `length`. This property, as the name suggests, stores the number of elements in the array.

It can also be used to change how many elements are in an array. By setting the `length` property you can tell JavaScript to add or remove items from the end of the array. If you set `length` to `0` it will empty the array.

### Example

```
let myArray = ["Apples", "Bananas", "Oranges"];
console.log("myArray.length: " + myArray.length); // Output: myArray.length: 3

myArray.length = 5;
console.log("myArray: " + myArray); // Output: myArray: Apples,Bananas,Oranges,,

myArray.length = 1;
console.log("myArray: " + myArray); // Output: myArray: Apples
```

## Up Next
Our next topic is strings and how to manipulate them. Click [here](./tutorial-1-6.md) when you feel comfortable.
