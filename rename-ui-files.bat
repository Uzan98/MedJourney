@echo off
echo Renomeando arquivos UI para padronizar casing...

:: Renomear os arquivos que estão causando conflitos
if exist src\components\ui\DropdownMenu.tsx (
    echo Renomeando DropdownMenu.tsx para dropdown-menu.tsx
    ren src\components\ui\DropdownMenu.tsx dropdown-menu.tsx
)

if exist src\components\ui\Badge.tsx (
    echo Renomeando Badge.tsx para badge.tsx
    ren src\components\ui\Badge.tsx badge.tsx
)

if exist src\components\ui\Modal.tsx (
    echo Renomeando Modal.tsx para modal.tsx
    ren src\components\ui\Modal.tsx modal.tsx
)

if exist src\components\ui\ThemeComponents.tsx (
    echo Renomeando ThemeComponents.tsx para theme-components.tsx
    ren src\components\ui\ThemeComponents.tsx theme-components.tsx
)

if exist src\components\ui\SubjectCard.tsx (
    echo Renomeando SubjectCard.tsx para subject-card.tsx
    ren src\components\ui\SubjectCard.tsx subject-card.tsx
)

if exist src\components\ui\Loader.tsx (
    echo Renomeando Loader.tsx para loader.tsx
    ren src\components\ui\Loader.tsx loader.tsx
)

if exist src\components\ui\Skeleton.tsx (
    echo Renomeando Skeleton.tsx para skeleton.tsx
    ren src\components\ui\Skeleton.tsx skeleton.tsx
)

:: Verificar se existem arquivos com letras maiúsculas que conflitam com os minúsculos
if exist src\components\ui\Button.tsx (
    echo Renomeando Button.tsx para button.tsx (temp)
    ren src\components\ui\Button.tsx button-temp.tsx
    ren src\components\ui\button-temp.tsx button.tsx
)

if exist src\components\ui\Card.tsx (
    echo Renomeando Card.tsx para card.tsx (temp)
    ren src\components\ui\Card.tsx card-temp.tsx
    ren src\components\ui\card-temp.tsx card.tsx
)

if exist src\components\ui\Tabs.tsx (
    echo Renomeando Tabs.tsx para tabs.tsx (temp)
    ren src\components\ui\Tabs.tsx tabs-temp.tsx
    ren src\components\ui\tabs-temp.tsx tabs.tsx
)

if exist src\components\ui\Toast.tsx (
    echo Renomeando Toast.tsx para toast.tsx (temp)
    ren src\components\ui\Toast.tsx toast-temp.tsx
    ren src\components\ui\toast-temp.tsx toast.tsx
)

echo Concluído! 