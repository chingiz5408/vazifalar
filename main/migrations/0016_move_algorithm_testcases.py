from django.db import migrations


def move_algorithm_tests(apps, schema_editor):
    """`algorithm` topshiriqlarining TestCase'larini AlgoritmTestCase'ga ko'chiradi.

    Eski yozuvlar `TestCase` (programming) jadvalida qolib ketmasligi uchun
    ular algoritm vazifasiga bog'lanadi, so'ng o'chiriladi.
    """
    Topshiriqlar = apps.get_model("main", "Topshiriqlar")
    AlgoritmVazifalar = apps.get_model("main", "AlgoritmVazifalar")
    TestCase = apps.get_model("main", "TestCase")
    AlgoritmTestCase = apps.get_model("main", "AlgoritmTestCase")

    tasks = Topshiriqlar.objects.filter(turi="algorithm")

    for task in tasks:
        tests = list(TestCase.objects.filter(task=task).order_by("order", "id"))
        if not tests:
            continue

        vazifa = AlgoritmVazifalar.objects.filter(topshiriq=task).first()
        if vazifa is None:
            vazifa = AlgoritmVazifalar.objects.create(
                topshiriq=task,
                input_variables="",
                output_variables="",
                sample_diagram={},
            )

        AlgoritmTestCase.objects.filter(vazifa=vazifa).delete()
        AlgoritmTestCase.objects.bulk_create([
            AlgoritmTestCase(
                vazifa=vazifa,
                input_data=test.input_data,
                expected_output=test.expected_output,
                order=index,
                is_sample=test.is_sample,
            )
            for index, test in enumerate(tests, start=1)
        ])
        TestCase.objects.filter(pk__in=[test.pk for test in tests]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("main", "0015_algoritmtestcase"),
    ]

    operations = [
        migrations.RunPython(move_algorithm_tests, migrations.RunPython.noop),
    ]
