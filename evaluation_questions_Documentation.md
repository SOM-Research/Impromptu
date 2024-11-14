## evaluation_question.prm Documentation

The file `evaluation_questions.prm` containts several prearrenged assets that helps the users generating prompts in the context of creating an exam. These assets are created to <b>generate prompts to be used in ChatGPT</b> especifically, so their performance in another LLM may diverge.

Here it will be explanied all those functions plus some examples of their usage


### Question formats
#### `true_false_answers(@option)`

Use it to indicate that the questions of the exam **should be true/false question**

- `@option`: Indicates any addition option related to these questions. Ususally it should be one of the question of the category Option Assets . In case you do not want to add any additional task, add an empty string (i.e " ").



#### `complete_gaps_questions(@option)`
Use it to indicate that the questions of the exam **are filling-the-gaps type**. For example

*When applying for a job, it is essential to submit a well-written __________ that introduces yourself and highlights your skills.*

- `@option`: Indicates any addition option related to these questions. Ususally it should be one of the question of the category Option Assets . In case you do not want to add any additional task, add an empty string (i.e " ").



#### `open_answer_question(@lenght)`
Use it to indicate that the questions of the exam **are open questions**.

- `@lenght`: Indicate the number of words of the answers at maximum.

#### `paraphrase()`
Use it to indicate that the questions of the exam **are about rephrasing a given sentence** (mainly used for language exams). Example:

***Original Sentence**: I am interested in the software developer position.*
***Words to Use**: apply, position, keen*
***Rephrased Sentence**: _______________________________________________________*
#### `choose_one_answers(@option)`
Use it to indicate that the questions of the exam **are multiple-choice type questions**. 

- `@option`: Indicates any addition option related to these questions. Ususally it should be one of the question of the category Option Assets . In case you do not want to add any additional task, add an empty string (i.e " ").

> In case the user wants multiple-choice questions, but for maybe more than one choice should be selected, add the option `multiple_answers_option()`.


#### `match_format()`
Use it to indicate that the questions of the exam **matching questions**. For example

*Match each term related to job applications with its correct definition. Write the letter of the correct answer next to each term.*

1) *Resume*
2) *Reference*
3) *Cover Letter*
4) *Interview*

a) *A document summarizing a person's work experience, education, and skills.*

b) *A person who can provide information about your character and work experience.*

c) *A written statement explaining why you are interested in a job and why you are qualified.*

d) *A formal meeting to assess a candidate’s suitability for a role.*



#### `search_errors(@text_topic )`
Use it to indicate that the questions of the exam **are about correcting gramatical and spelling errors** in a text. The text is genered by the LLM itself about the topic `@text_topic` chosen.



#### `multi_format(@formatA,@numberA,@formatB,@numberB)`
This command allows to divide the test in two parts, each one with a different format
- `@formatA` **Asset** that generates questions
- `@numberA` Number of questions of the first type
- `@formatB` **Asset** that generates questions
- `@numberB` Number of questions of the second type

If the total number of questions of the exam (declared with `number_questions()`) is greater than the sum of both parts, ChatGPT tends to add additional question of the “easier” among them. For example, in the previous example, it will add more multi-choice questions.

### *Option Assets*
There are the assets that modify question assets to transform them into a similar mode

#### `multiple_answers_option()`
Use it to indicate that questions of the exam are **mulitple option questions**.



#### `correct_answers_option()`
*Option made for `true_false_answers()`*. In addition to answer the question the exameniees have to correct the question's statement (in case is false) as well.

#### `only_one_text_option()`
*Option made for `complete_gaps_questions()`*. Instead of compleating a phrase, all questions  are form a same text.

#### `answer_options(@number,@answers, @distractors)`
*Option made for `multiple_answers_option()`*. Spicify the number of questions, the wanted correct answers, and the wanted distractors. In case the number of questions is lower than the correct answers given, **ChatGPT will use the first ones**. In addition, it will discard the *odd* distractors, and add in case few distractors were declared.

### General assets

In this section are located the assets that helps declaring the general properties of the exam, such as its topic or lenght. **It is highly recommended write the assets in the order that are displaced here** so that the generated prompt make more sense.
#### `InitialConditions()`
Prefix of an exam prompt. It is recommended to add it in the prefix.

#### `question_topic(@topic)`
Declare the subject of the exam (i.e: `question_topic("geography")`).


#### `question_from_picture (@element )`
*In Progress*. The question of the exam should be made related to the metadata `@element`

#### `goal_content(@source)`
Specify **the source** used to generate the questions, that is, the **learning resources/contents**. It can also be used to specify more the subject of the exam (i.e, the vucabulary topic in an English exam).

--------------
#### Difficulty of the questions

#### `easy_question()`
Choose the question so that they are easy/introductory to the prior level chosen.
#### `medium_question()`
#### `hard_question()`
Choose the question so that they are challenging to the prior level chosen.

-------------------------------
#### `distractor_selection(@example)`
*In Progress* Give an example of a multiple answer so that similar distractors were chosen


#### `number_questions(@number)`
Specify the number of questions of the exam.


#### `example_question(@example)`
Provide an example of the question are wanted to be
- `@example` The example question

#### `duration_exam(@level,@times)`
Provide how much time the exam should last (in minutes)

#### `level(@level)`
Spicify the difficulty wanted of the questions.
- `@level`. Knowledge level expected of the students i.e "First-Grade"

#### `school_level(@level,@course)`
Spicify the educacional level of the students that will be examinated, based of scholarship-level.
- `@level`. Scholarship level, i.e "Secondary school"
- `@level`. Study year. i.e "K-12","First-Grade"

#### `language_level(@level)`
Spicify the educacional level of the students that will be examinated, based on langugae-certification level (for languge exams).
- `@level`. Language level, i.e "B1"

#### `answer_format(@format)`
Spicify the format of the response, such as JSON or XML.


#### `give_answers()`
Specify that the answers of the question has to be provided as well.


#### `DetailedInstructions()`
Suffix of the exam prompt so that the answer is more concise and clean. It is recommended to add it in the suffix.


## Examples

##### Code:
```prompt main(): text
    prefix = InitialConditions()
    core = 
        question_topic("B2-level English"), rephase(), duration_exam("B2 English","10"),goal_content("job application vocabulary"), give_answers()
    suffix = DetailedInstructions()
    separator="."
    language=English
```
##### Generated prompt:
*Write an exam. Before writing the question, give a brief explanation of the task.Write a B2-level English exam.The questions should be rephase phases to use the new grammar/vocabulary.Provide some words to be used in the answer.Select the questions so that it can be solved by B2 English students in 10 minutes.Base your questions on job application vocabulary and related grammar.Provide the answers of the questions as well.Questions should be clear .Avoid controversial topics.The questions should be as concise as possible.*

##### Response:
----------------------------
*Task Explanation:*
*In this exam, you will rephrase sentences using the provided words. This exercise will test your understanding of job application vocabulary and related grammar. You have 10 minutes to complete the task.*
*Questions:*
*Original Sentence: I want to apply for the marketing position.*
*Rephrase using the word "application":*
*Word to use: application*
*Rephrased Sentence: ____________________________________*
*Original Sentence: The company offers great benefits and a good salary.*
*Rephrase using the word "remuneration":*
*Word to use: remuneration*
*Rephrased Sentence: __________________________________*
