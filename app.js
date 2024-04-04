document.addEventListener('DOMContentLoaded', () => {
    const categoryForm = document.getElementById('categoryForm');
    const itemForm = document.getElementById('itemForm');
    const planForm = document.getElementById('planForm');
    const itemCategorySelect = document.getElementById('itemCategory');
    const categoriesListDiv = document.getElementById('categoriesList');
    const exportDataBtn = document.getElementById("exportData");
    const importDataBtn = document.getElementById("importData");

    let categories = new Map();

    function calculateTotalWeight() {
        let totalWeight = 0;
        categories.values().forEach(c => {
            totalWeight += c.weight;
        })
        return totalWeight;
    }

    // source: https://stackoverflow.com/questions/29085197/how-do-you-json-stringify-an-es6-map
    function replacer(key, value) {
      if(value instanceof Map) {
        return {
          dataType: 'Map',
          value: Array.from(value.entries()), // or with spread: value: [...value]
        };
      } else {
        return value;
      }
    }

    function reviver(key, value) {
      if(typeof value === 'object' && value !== null) {
        if (value.dataType === 'Map') {
          return new Map(value.value);
        }
      }
      return value;
    }

    // export data
    exportDataBtn.addEventListener('click', (e) => {
        e.preventDefault();

        const data = 'data:application/json;charset=utf-8,'+ encodeURIComponent(JSON.stringify(categories, replacer));

        //Write it as the href for the link
        const downloadElement = document.getElementById("exportDataDownload");
        downloadElement.setAttribute("href", data);
        downloadElement.setAttribute("download", "data.json");
        downloadElement.click();
    })

    // import data
    importDataBtn.addEventListener('click', (e) => {
        e.preventDefault();
        var input = document.createElement('input');
        input.type = 'file';

        input.onchange = (e) => {
            // getting a hold of the file reference
            var file = e.target.files[0]; 

            // setting up the reader
            var reader = new FileReader();
            reader.readAsText(file,'UTF-8');

            // here we tell the reader what to do when it's done reading...
            reader.onload = readerEvent => {
                var content = readerEvent.target.result; // this is the content!
                categories = JSON.parse(content, reviver);
                render();
            }
        };

        input.click();
    })

    // Add category
    categoryForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('categoryName').value;
        const weight = parseInt(document.getElementById('categoryWeight').value);

        if (weight > 0 && weight <= 100) {
            // total weight should be smaller than 100
            const totalWeight = calculateTotalWeight();
            if ((totalWeight + weight) > 100) {
                alert("Total weight should be smaller than or equal to 100");
                return;
            }

            const categoryId = Date.now().toString(); // categroy ID generate
            categories.set(categoryId, {items: [], name, weight });
            render();
            categoryForm.reset();
        } else {
            alert('Category weight must be between 1 and 100.');
        }
    });

    // Add item
    itemForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const categoryId = itemCategorySelect.value;
        const name = document.getElementById('itemName').value;
        const cost = parseFloat(document.getElementById('itemCost').value).toFixed(2);
        if (!isNaN(cost) && cost > 0) {
            categories.get(categoryId).items.push({name, cost});
            renderCategories();
            itemForm.reset();
        } else {
            alert('Invalid cost value.');
        }
    });

    // generate plan
    planForm.addEventListener('submit', (e) => {
        e.preventDefault();

        if (categories.size == 0) {
            alert("Please fill in some data");
            return;
        }

        if (calculateTotalWeight() != 100) {
            alert("The total weight of all categories should be equal to 100");
            return;
        }

        const budget = parseFloat(document.getElementById('budget').value).toFixed(2);

        let result = new Map();
        categories.keys().forEach(categoryId => {
            const category = categories.get(categoryId);
            const categoryBudget = ((budget / 100) * category.weight).toFixed(2);
            result.set(categoryId, dp(categoryBudget, category.items));
        });

        const planListDiv = document.getElementById("planList");
        planListDiv.innerHTML = "";

        result.keys().forEach(categoryId => {
            const category = categories.get(categoryId);
            const rst = result.get(categoryId);
            const catCost = (parseFloat(rst[0]) / 100).toFixed(2);
            const catItems = rst[2];
            const catUtility = rst[1];
            const planItemDiv = document.createElement('div');
            planItemDiv.classList.add('mb-3');
            planItemDiv.innerHTML = `
                <h4>${category.name} (Category Budget: ${((budget / 100) * category.weight).toFixed(2)}, Category Cost: ${catCost}, Category Satisfaction: ${catUtility})</h4>
                <ul class="list-group">
                    ${catItems.map((item, index) => `
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            Name: ${item.name} - $${(item.cost / 100).toFixed(2)}
                        </li>
                    `).join('')}
                </ul>
            `;
            planListDiv.appendChild(planItemDiv);
        });


        console.log(result)

    });

    function dp(budget, items) {
        // maximize utility in given budget

        // convert item prices to cents
        budget = Math.floor(budget * 100);
        items = JSON.parse(JSON.stringify(items));
        items.map(item => {
            item.cost = Math.floor(item.cost * 100);
        })

        //[currentActualCost, currentActualUtility, currentItems]
        const dpMemo = Array.from({length: items.length + 1}, () => Array.from({length: budget + 1}, () => [0, 0, []])) 

        for (let curItemIndex = 1; curItemIndex <= items.length; curItemIndex++) {
            const item = items[curItemIndex - 1];
            const curItemCost = parseInt(item.cost);
            const curItemUtility = parseInt(items.length - curItemIndex + 1);

            for (let curBudget = 1; curBudget <= budget; curBudget++) {
                if (curItemCost <= curBudget && ((dpMemo[curItemIndex - 1][curBudget - curItemCost][1]) + curItemUtility > dpMemo[curItemIndex - 1][curBudget][1])) {
                    dpMemo[curItemIndex][curBudget] = [dpMemo[curItemIndex - 1][curBudget - curItemCost][0] + curItemCost, dpMemo[curItemIndex - 1][curBudget - curItemCost][1] + curItemUtility, dpMemo[curItemIndex - 1][curBudget - curItemCost][2].concat([item,])];
                } else {
                    dpMemo[curItemIndex][curBudget] = dpMemo[curItemIndex - 1][curBudget];
                }
            }
        }

        return dpMemo[items.length][budget];
    }

    // Update categories dropdown
    function updateCategoriesDropdown() {
        let htmlContent = "";
        categories.keys().forEach(categoryId => {
            category = categories.get(categoryId);
            htmlContent += `<option value="${categoryId}">${category.name}</option>`
        });
        itemCategorySelect.innerHTML = htmlContent;
    }

    // Render categories and items
    function renderCategories() {
        categoriesListDiv.innerHTML = '';
        categories.keys().forEach(categoryId => {
            const category = categories.get(categoryId);
            const catItems = category.items;
            const categoryDiv = document.createElement('div');
            categoryDiv.classList.add('mb-3');
            categoryDiv.innerHTML = `
                <h4>${category.name} (Weight: ${category.weight}) <button data-id="${categoryId}" class="btn btn-secondary btn-sm edit-category">Edit</button> <button data-id="${categoryId}" class="btn btn-danger btn-sm delete-category">Delete</button></h4>
                <ul class="list-group">
                    ${catItems.map((item, index) => `
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            Name: ${item.name} - $${item.cost}
                            <span>
                                <button data-id="${index}" class="btn btn btn-sm up-item">↑</button>
                                <button data-id="${index}" class="btn btn btn-sm down-item">↓</button>
                                <button data-id="${index}" class="btn btn-secondary btn-sm edit-item">Edit</button>
                                <button data-id="${index}" class="btn btn-danger btn-sm delete-item">Delete</button>
                            </span>
                        </li>
                    `).join('')}
                </ul>
            `;
            categoriesListDiv.appendChild(categoryDiv);
        });

        if (categories.size == 0) {
            categoriesListDiv.innerHTML = `<h5>EMPTY</h5>`;
        }

        bindEditAndDeleteActions();
    }

    function bindEditAndDeleteActions() {
        // Delete Category
        document.querySelectorAll('.delete-category').forEach(button => {
            button.addEventListener('click', function() {
                const categoryId = this.getAttribute('data-id');
                categories.edit(categoryId);
                render();
            });
        });

        // Delete Item
        document.querySelectorAll('.delete-item').forEach(button => {
            button.addEventListener('click', function() {
                const categoryId = this.parentElement.parentElement.parentElement.parentElement.firstElementChild.firstElementChild.getAttribute("data-id");
                const itemIndex = this.getAttribute('data-id');
                categories.get(categoryId).items.pop(itemIndex);
                renderCategories();
            });
        });

        // Edit Category
        document.querySelectorAll('.edit-category').forEach(button => {
            button.addEventListener('click', function() {
                const categoryId = this.getAttribute('data-id');
                const categoryToEdit = categories.get(categoryId);
                if (categoryToEdit) {
                    const newName = prompt("Enter new name for the category", categoryToEdit.name);
                    const newWeight = prompt("Enter new weight for the category (1-100)", categoryToEdit.weight);
                    if (newName && !isNaN(newWeight) && (calculateTotalWeight() - categoryToEdit.weight + parseInt(newWeight)) <= 100) {
                        categoryToEdit.name = newName;
                        categoryToEdit.weight = parseInt(newWeight);
                        render();
                    }
                }
            });
        });

        // Edit Item
        document.querySelectorAll('.edit-item').forEach(button => {
            button.addEventListener('click', function() {
                const categoryId = this.parentElement.parentElement.parentElement.parentElement.firstElementChild.firstElementChild.getAttribute("data-id");
                const itemIndex = this.getAttribute('data-id');
                const itemToEdit = categories.get(categoryId).items[itemIndex];
                if (itemToEdit) {
                    const newName = prompt("Enter new name for the item", itemToEdit.name);
                    const newCost = prompt("Enter new cost for the item", itemToEdit.cost);
                    if (newName && !isNaN(newCost)) {
                        itemToEdit.name = newName;
                        itemToEdit.cost = parseFloat(newCost).toFixed(2);
                        renderCategories();
                    }
                }
            });
        });

        // up item
        document.querySelectorAll('.up-item').forEach(button => {
            button.addEventListener('click', function() {
                const categoryId = this.parentElement.parentElement.parentElement.parentElement.firstElementChild.firstElementChild.getAttribute("data-id");
                const itemIndex = parseInt(this.getAttribute('data-id'));
                if (itemIndex <= 0) {
                    return;
                }

                const temp = categories.get(categoryId).items[itemIndex];
                categories.get(categoryId).items[itemIndex] = categories.get(categoryId).items[itemIndex - 1];
                categories.get(categoryId).items[itemIndex - 1] = temp;
                renderCategories();
            });
        });

        // down item
        document.querySelectorAll('.down-item').forEach(button => {
            button.addEventListener('click', function() {
                const categoryId = this.parentElement.parentElement.parentElement.parentElement.firstElementChild.firstElementChild.getAttribute("data-id");
                const itemIndex = parseInt(this.getAttribute('data-id'));
                
                if (itemIndex >= (categories.get(categoryId).items.length - 1)) {
                    return;
                }

                const temp = categories.get(categoryId).items[itemIndex];
                categories.get(categoryId).items[itemIndex] = categories.get(categoryId).items[itemIndex + 1];
                categories.get(categoryId).items[itemIndex + 1] = temp;
                console.log(categories.get(categoryId).items);
                renderCategories();
            });
        });
    }

    function render() {
        updateCategoriesDropdown();
        renderCategories();
    }

    // Initial Call to render categories list and update dropdown
    render();
});

