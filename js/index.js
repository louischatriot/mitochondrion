console.log("===");


function plus(a, b) { return a + b }
function invert(a) { return - a }

var functions = {
    "invert": invert,
    "plus": plus
}


function Node(value, cell, func, left, right) {
    this.value = value
    this.cell = cell
    this.func = func
    this.left = left
    this.right = right
}

Node.prototype.evaluate = function () {
    if (this.value) {
        return this.value
    } else if (this.cell) {
        return this.cell.value()
    } else if (this.func) {
        if (!this.left) {
            return this.func(this.right.evaluate())
        } else if (!this.right) {
            return this.func(this.left.evaluate())
        } else {
            return this.func(this.left.evaluate(), this.right.evaluate())
        }
    } else {
        throw new Error("Illegal node!")
    }
}



function extract_cell_name(f) {

}



var single_character_elements = ["(", ")", "+", "*", "-", "/", ","]

// Convention: functions are lowercase, cell coordinates upper case
function parse_formula(f) {
    if (!f || f.length === 0) { return new Node("") }
    if (f[0] === "'") { return new Node(f.substring(1)) }
    if (f[0] !== "=") { return new Node(f) }

    // We have a formula
    var elements = [], func_name, cell_name, number, length
    var i = 1
    f = f.replace(/ /g, "")

    // Extract elements
    while (i < f.length) {
        if (single_character_elements.indexOf(f[i]) !== -1) {
            elements.push(f[i])
            i += 1

        } else if (f[i] >= 'a' && f[i] <= 'z') {   // Function name
            func_name = f.match(new RegExp("^.{" + i + "}([a-z]+)"))
            if (!func_name) { throw new Error("Expected function name") }
            func_name = func_name[1]
            elements.push(func_name)
            i += func_name.length

        } else if (f[i] >= 'A' && f[i] <= 'Z') {   // Cell name
            cell_name = f.match(new RegExp("^.{" + i + "}([A-Z]+[0-9]+)"))
            if (!cell_name) { throw new Error("Expected cell name") }
            cell_name = cell_name[1]
            elements.push(cell_name)
            i += cell_name.length

        } else if (f[i] >= '0' && f[i] <= '9') {   // Number
            number = f.match(new RegExp("^.{" + i + "}([0-9]+\\.[0-9]+)"))
            if (number) {
                number = number[1]
                length = number.length
                number = parseFloat(number)
            } else {
                number = f.match(new RegExp("^.{" + i + "}([1-9][0-9]*)"))
                if (!number) { throw new Error("Expected number") }
                number = number[1]
                length = number.length
                number = parseInt(number, 10)
            }
            elements.push(number)
            i += length

        } else {
            throw new Error("Unexpected character")
        }
    }

    // Create calculation tree

    console.log(elements);

    tree = create_tree(elements)

    console.log(tree);



    return elements
}




function create_tree(elements) {
    if (elements.length === 0) { return null }

    var elt = elements[0]

    if (elements.length === 1) {
        if (elt[0] >= 'A' && elt[0] <= 'Z') {
            return new Node(null, elt, null, null, null)
        } else if (! isNaN(elt)) {
            return new Node(elt, null, null, null, null)
        } else {
            throw new Error("Unexpected element type")
        }
    }

    if (elt[0] >= 'a' && elt[0] <= 'z') {   // Function
        if (!functions[elt]) {
            throw new Error("Unknown function: " + elt)
        }

        if (elements.length === 1) {
            throw new Error("Nothing passed to function " + elt)
        }

        var func = functions[elt]
        var args = [], opened = 1, i = 2, arg

        while (opened > 0 && i < elements.length) {
            arg = []
            while (i < elements.length) {
                if (opened === 1 && (elements[i] === "," || elements[i] === ")")) { break }

                if (elements[i] === "(") {
                    opened += 1
                }

                if (elements[i] === ")") {
                    opened -= 1
                }

                arg.push(elements[i])
                i += 1
            }

            args.push(arg)

            if (elements[i] === ")") {
                break
            }

            i += 1
        }

        console.log(args);

        throw new Error("Missing closing parenthesis")

    }


}









