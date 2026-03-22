/**
 * Function to apply structural optimizations to the Google Form.
 * This function should be run once to update the form.
 */
function optimizeEventFormStructure() {
  var form = FormApp.getActiveForm();

  // 1. Split "Who is the main contact and his/her email" into two fields.
  var contactQuestionTitle = "Who is the main contact and his/her email";
  var contactQuestion = findQuestionByTitle(form, contactQuestionTitle);

  if (contactQuestion) {
    // Determine where to insert new questions relative to the original
    var originalIndex = form.getItems().findIndex(item => item.getId() === contactQuestion.getId());

    // Remove the original combined question
    form.deleteItem(originalIndex);

    // Add 'Contact Name' as a new text item
    var contactNameItem = form.addTextItem().setTitle("Contact Name");
    contactNameItem.setRequired(true);
    // Move it to the original position
    form.moveItem(form.getItems().length - 1, originalIndex);

    // Add 'Contact Email' as a new text item with email validation
    var contactEmailItem = form.addTextItem().setTitle("Contact Email");
    contactEmailItem.setRequired(true);
    contactEmailItem.asTextItem().setValidation(
      FormApp.createTextValidation()
        .requireTextIsEmail()
        .setHelpText("Please enter a valid email address.")
        .build()
    );
    // Move it to the position after 'Contact Name'
    form.moveItem(form.getItems().length - 1, originalIndex + 1);

    Logger.log("Split '%s' into 'Contact Name' and 'Contact Email'.", contactQuestionTitle);
  } else {
    Logger.log("Question '%s' not found. Skipping split.", contactQuestionTitle);
  }


  // 2. Use Exact Numbers for Attendance (Question 4)
  // Assuming "Estimated Attendance" is the title for Question 4
  var attendanceQuestionTitle = "Estimated Attendance";
  var attendanceQuestion = findQuestionByTitle(form, attendanceQuestionTitle);

  if (attendanceQuestion && attendanceQuestion.getType() !== FormApp.ItemType.TEXT) {
    var itemIndex = form.getItems().findIndex(item => item.getId() === attendanceQuestion.getId());
    // Remove old question
    form.deleteItem(itemIndex);
    // Add new Text Item with number validation
    var newAttendanceItem = form.addTextItem().setTitle(attendanceQuestionTitle);
    newAttendanceItem.setRequired(true);
    newAttendanceItem.asTextItem().setValidation(
      FormApp.createTextValidation()
        .requireNumber()
        .setHelpText("Please enter a number.")
        .build()
    );
    // Move it back to the original position
    form.moveItem(form.getItems().length - 1, itemIndex);
    Logger.log("Updated '%s' to require number input.", attendanceQuestionTitle);
  } else if (attendanceQuestion && attendanceQuestion.getType() === FormApp.ItemType.TEXT) {
     // If it's already a text item, just ensure validation
     attendanceQuestion.asTextItem().setValidation(
      FormApp.createTextValidation()
        .requireNumber()
        .setHelpText("Please enter a number.")
        .build()
    );
     Logger.log("Ensured '%s' already requires number input.", attendanceQuestionTitle);
  }
  else {
    Logger.log("Question '%s' not found. Skipping attendance update.", attendanceQuestionTitle);
  }

  // 3. Update "Tech Needs" (Q21) to a Checkbox question.
  // Assuming "Which tech roles are required?" is the new title suggested for Q21.
  // The original prompt suggests changing it from a "multi-select grid" to a single question.
  // Let's assume the current question exists and we want to convert it to CheckboxItem.
  // If the question is a Grid or other complex type, it might need to be deleted and recreated.
  var techNeedsQuestionTitle = "Which tech roles are required?"; // New title as per recommendation
  var originalTechNeedsTitle = "Tech Needs"; // Assuming this was the old title for finding purposes.

  var techNeedsQuestion = findQuestionByTitle(form, techNeedsQuestionTitle) || findQuestionByTitle(form, originalTechNeedsTitle);

  if (techNeedsQuestion) {
    var itemIndex = form.getItems().findIndex(item => item.getId() === techNeedsQuestion.getId());

    // Assuming the original question had options like "Sound", "Projection", etc.
    // If it was a GridItem or other complex type, we need to extract options or know them.
    // For simplicity, let's assume we convert it to a CheckboxItem with specific options.
    // If the old item is not a CheckboxItem, we delete and recreate.

    if (techNeedsQuestion.getType() !== FormApp.ItemType.CHECKBOX) {
        var existingOptions = [];
        // Attempt to get choices if it's a type that has them (e.g., MultipleChoice, ListItem, Checkbox)
        try {
            if (techNeedsQuestion.asMultipleChoiceItem()) {
                existingOptions = techNeedsQuestion.asMultipleChoiceItem().getChoices().map(choice => choice.getValue());
            } else if (techNeedsQuestion.asListItem()) {
                existingOptions = techNeedsQuestion.asListItem().getChoices().map(choice => choice.getValue());
            } else if (techNeedsQuestion.asCheckboxItem()) {
                existingOptions = techNeedsQuestion.asCheckboxItem().getChoices().map(choice => choice.getValue());
            }
        } catch (e) {
            Logger.log("Could not extract options from existing Tech Needs question. Assuming defaults. Error: %s", e.message);
        }

        // Default options if none extracted or if we're replacing a grid
        if (existingOptions.length === 0) {
            existingOptions = ["Sound", "Projection", "Lighting", "Stage Management"];
        }


        form.deleteItem(itemIndex);
        var newTechNeedsItem = form.addCheckboxItem().setTitle(techNeedsQuestionTitle);
        newTechNeedsItem.setChoices(existingOptions.map(option => newTechNeedsItem.createChoice(option)));
        newTechNeedsItem.setRequired(true);
        form.moveItem(form.getItems().length - 1, itemIndex);
        Logger.log("Updated '%s' to a Checkbox item with options: %s", techNeedsQuestionTitle, existingOptions.join(', '));
    } else {
      Logger.log("'%s' is already a Checkbox item. No change needed.", techNeedsQuestionTitle);
    }
  } else {
    Logger.log("Question for Tech Needs not found. Skipping update.", techNeedsQuestionTitle);
  }

  Logger.log("Form optimization script finished.");
}

/**
 * Generates a CSV of all question titles and creates a file in Google Drive.
 * Run this to quickly get the titles for your 'Event Form Email List' sheet.
 */
function exportQuestionsToCSV() {
  var form = FormApp.getActiveForm();
  var items = form.getItems();
  var csvContent = "Question Title,Item Type,Possible Values\n";

  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var type = item.getType();
    
    // Skip non-question items
    if (type === FormApp.ItemType.IMAGE || type === FormApp.ItemType.PAGE_BREAK || 
        type === FormApp.ItemType.SECTION_HEADER || type === FormApp.ItemType.VIDEO) {
      continue;
    }

    var title = item.getTitle().replace(/"/g, '""');
    var possibleValues = "";

    // Extract options based on the question type
    try {
      if (type === FormApp.ItemType.MULTIPLE_CHOICE) {
        possibleValues = item.asMultipleChoiceItem().getChoices().map(c => c.getValue()).join(" | ");
      } else if (type === FormApp.ItemType.CHECKBOX) {
        possibleValues = item.asCheckboxItem().getChoices().map(c => c.getValue()).join(" | ");
      } else if (type === FormApp.ItemType.LIST) {
        possibleValues = item.asListItem().getChoices().map(c => c.getValue()).join(" | ");
      } else if (type === FormApp.ItemType.CHECKBOX_GRID) {
        var grid = item.asCheckboxGridItem();
        possibleValues = "Rows: " + grid.getRows().join(", ") + " | Columns: " + grid.getColumns().join(", ");
      } else if (type === FormApp.ItemType.GRID) {
        var grid = item.asGridItem();
        possibleValues = "Rows: " + grid.getRows().join(", ") + " | Columns: " + grid.getColumns().join(", ");
      }
    } catch (e) {
      possibleValues = "Error extracting values: " + e.message;
    }

    csvContent += '"' + title + '","' + type + '","' + possibleValues.replace(/"/g, '""') + '"\n';
  }

  var fileName = form.getTitle() + " - Question Mapping Data.csv";
  var file = DriveApp.createFile(fileName, csvContent, MimeType.CSV);
  
  Logger.log("CSV created successfully!");
  Logger.log("File Name: " + fileName);
  Logger.log("File URL: " + file.getUrl());
}

/**
 * Helper function to find a question by its title.
 * @param {GoogleAppsScript.Forms.Form} form The form to search within.
 * @param {string} title The title of the question to find.
 * @returns {GoogleAppsScript.Forms.Item|null} The found question item, or null if not found.
 */
function findQuestionByTitle(form, title) {
  var items = form.getItems();
  for (var i = 0; i < items.length; i++) {
    if (items[i].getTitle() === title) {
      return items[i];
    }
  }
  return null;
}
