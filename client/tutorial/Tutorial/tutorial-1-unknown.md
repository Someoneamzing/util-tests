# Section 1.5
This section will explore the different methods of string manipulation.

## Wello Horld!
JavaScript has many ways of working with strings but they all boil down to some basic operations:

| Operation | Description |
| --------- | ----------- |
| Join | Joining or concatenating as it's known as in programming involves taking two strings and putting them together. |
| Search | Searching essentially means looking for a particular piece of text, a pattern or a specific character. |
| Extract | Extracting involves taking a part of a string and using that instead of the whole thing. |
| Replace | Replacement involves all three of the above operations. Find the text to be replaced, remove it from the original string and Join it with the new replacement. |
| Case Transformation | Case Transformation involves replacement, converting letters in a string to their capital or lowercase equivalent. |

We will go over each in more detail and the methods of performing each operation.

## Joining Strings
In JavaScript joining strings is very simple. Using the `+` operator with strings instead of numbers will add the second string onto the end of the first.

### Example
```
console.log("A very " + "interesting combination."); //Output: A very interesting combination.
console.log("These" + " are " + "some very redundant " + "+'s"); //Output: These are some very redundant +'s
```

Note:
- JavaScript does not automatically add spaces. If you want your words to remain separate you must put the spaces in manually. This is why you can see the spaces just before the end of the first string, `"A very "`.
- JavaScript ignores operators inside of strings, that is why we can display the `+` on the screen in the second example.

This also works for variables containing strings:
```
let string1 = "Hello ";
let string2 = "World!";
console.log(string1 + string2); // Output: Hello World!
```

## Concatenating? What's That?
In programming the term concatenation (pronounced con - cat - eh - nation) means to join two things. In relation to strings it is what we have just done with the `+` operator. There are other methods of achieving this as well. One such method is called `concat()`, short for concatenate. We use it like so:

### Example
```
let myString1 = "This is concat";
let myString2 = "enation. Isn't it beautiful?";
console.log(myString1.concat(myString2));
```

This has the same effect as `myString1 + myString2` and is included for reasons we will explain in the section about objects. Also note the `.` in between `myString1` and `concat()`; This tells JavaScript where to separate the variable name from the method. If we were to just type `myString1concat(myString2);` JavaScript would spit out a big red error saying that it doesn't know what `myString1concat` is. We will explain what the `.` character means in full in the object section.

## Searching Within a String
Finding parts of a string is extremely useful in JavaScript. What if you want to see if there is a mention of you in a document or where the first number 2 is in a string. This is all enabled by JavaScript's searching methods.

The most basic method is the `indexOf()` method. `indexOf()` is used like this:

```
let myString = "Where is the bee?";
console.log(myString.indexOf("b")) //Output: 13
```

This tells JavaScript to look for the first occurrence of the string `"b"` in `myString` and return the position of the match, in this case `13`. You'll notice that the letter `b` is actuallly the 14^(th)^ character however, as we stated before, JavaScript starts at 0.

`indexOf()` also takes a second argument. This argument tells JavaScript where to start searching from in the string:

```
let myString = "Lorem ipsum";
console.log(myString.indexOf("m",5)); //Output: 10
```

Here we have told JavaScript to find the first occurrence of the string `"m"` in `myString` after the 6th character.

Another method is `search()`. It performs the same task as `indexOf()`, however, it only takes one argument, the item to search for. This may seem redundant but there is a difference between `indexOf()`'s first parameter and that of `search()`. You may remember talk of patterns earlier on in the tutorial:

> Searching essentially means looking for a particular piece of text, a pattern or a specific character.

These patterns are known as regular expressions or regexes for short. We won't go into detail but know this:
- Regexes are much more powerful than simple searching for one string in another.
- Regexes can search for strings that are valid email addresses, web links etc.

We will have a section on regexes later in the tutorial, but for now know; both `search()` and `indexOf()` perform the same task, they find one string inside of another and return the position of the first occurrence.

There is one other method that behaves slightly different to the other two. `lastIndexOf()` as its name might suggest, returns the position of the last occurrence of a given string.

### Example
```
let myString = "Bogus the clown liked his big round ball.";
console.log(myString.lastIndexOf("b"));// Output: 36
```

Here instead of returning the position of the first occurrence of the string `"b"`, which is `0`, `lastIndexOf()` returned the position of the last occurrence: `36`.

If `search()`, `indexOf()` and `lastIndexOf()` can't find the string we are looking for then it will return `-1`:

```
let myString = "You can't find me!";
console.log(myString.indexOf('b'));// Output: -1
```

## Extracting Parts of a String
We now know how to look for parts of a string but what if we want to work with only part of that string? Extraction is the basic process of taking all of the characters between one position and another and returning the result. One method of doing so is `slice()`. Slice takes in two parameters, a starting position and an ending position. `slice()` is used like so:

```
let myString = "Apple, Banana, Kiwi";
console.log(myString.slice(7,13));// Output: Banana
```

Here we gave `slice()` a start and an end position, in this case `7` and `13`, and it returned what was in between those two positions. Note:
- `slice()` includes the character at the start position but not the character in the end position. (As discussed in the part on positions.)
