-- AlterTable
ALTER TABLE `component` MODIFY `type` ENUM('questionCheckbox', 'questionRadio', 'questionInput', 'questionTextArea', 'questionInfo', 'questionParagraph', 'questionTitle') NOT NULL;
