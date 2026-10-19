exports.up = async function (knex) {
  await knex.schema.alterTable("students", (table) => {
    table.string("full_name", 100).notNullable().alter();
    table.dropColumn("name");
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable("students", (table) => {
    table.string("name", 100).nullable();
  });
  
  await knex.raw("UPDATE students SET name = full_name WHERE name IS NULL");
};
