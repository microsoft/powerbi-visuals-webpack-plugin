const PowerBICustomVisualsWebpackPlugin = require('../index');
const fs = require('fs-extra');
const path = require('path');
const assert = require('assert');
const { performance } = require('perf_hooks');

describe("powerbi-visuals-webpack-plugin", function() {
    let options;

    before(function() {
        process.chdir(path.join('.', 'test', 'testVisual'));
        options = fs.readJSONSync('./pbiviz.json');
    });

    it('basic case for localization string resources', async function() {
        const expected = {
            "Visual_Category": "Test Category",
            "Visual_Values": "Values",
            "Visual_WordCloud_MaxNumberWords": "Max number of words",
            "Visual_WordCloud_WordBreaking": "Word-breaking",
            "Visual_WordCloud_SpecialCharacters": "Special characters",
            "Visual_WordCloud_DefaultStopWords": "Default Stop Words",
            "Visual_WordCloud_Words": "Words",
            "Visual_WordCloud_StopWords": "Stop Words",
            "Visual_WordCloud_MaxOrientationNumber": "Max number of orientations",
            "Visual_General": "General",
            "Visual_MinFontSize": "Min font size",
            "Visual_DataColors": "Data colors",
            "Visual_DefaultColor": "Default color",
            "Visual_Fill": "Fill",
            "Visual_MaxFontSize": "Max font size",
            "Visual_Show": "Show",
            "Visual_MinAngle": "Min Angle",
            "Visual_MaxAngle": "Max Angle",
            "Visual_RotateText": "Rotate Text",
            "Visual_Excludes": "Excludes",
            "Visual_PreestimateWordCount": "Pre-estimate words count to draw",
            "Visual_Quality": "Quality",
            "Visual_Performance": "Performance",
            "Visual_Description_Quality": "The value determines the quality of the pre-estimation"
        };
        const plugin = new PowerBICustomVisualsWebpackPlugin(options);
        const result = await plugin.parseLocalizationString(plugin.options);
        assert.deepEqual(result['en-US'], expected, "incorrect localizations");
    });
  });