exports.up = async function (knex) {
  await knex.schema.alterTable("students", (table) => {
    table.string("full_name", 100).nullable();
  });

  // ย้ายข้อมูลจาก name มาใส่ full_name (Data Backfill)
  await knex.raw("UPDATE students SET full_name = name WHERE full_name IS NULL");
};

exports.down = function (knex) {
  return knex.schema.alterTable("students", (table) => {
    table.dropColumn("full_name");
  });
};
