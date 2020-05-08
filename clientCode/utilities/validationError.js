"use strict";

export default class ValidationError
{
    constructor(inputControlSelector, errorMsg, cssClassesToAdd)
    {
        this.$inputControl = $(inputControlSelector);
        this.errorMsg = errorMsg;
        this.cssClassesToAdd = cssClassesToAdd;

        return this;
    }

    show()
    {
        const { $inputControl, errorMsg, cssClassesToAdd } = this,
            msgClass = "validationError",
            html = `<p class='${msgClass}${cssClassesToAdd ? ` ${cssClassesToAdd}` : "" }'>* ${errorMsg}</p>`,
            $errorMsg = $inputControl.next(`p.${msgClass}`);

        if ($errorMsg.length)
            $errorMsg.replaceWith(html);
        else
            $inputControl.after(html);
    }
}