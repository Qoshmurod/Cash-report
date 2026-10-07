import { DefaultNamingStrategy, NamingStrategyInterface } from 'typeorm';

const snake = (str: string): string =>
  str
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();

/** Maps camelCase entity properties to snake_case columns / tables. */
export class SnakeNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
  override tableName(className: string, customName?: string): string {
    return customName ?? snake(className);
  }

  override columnName(propertyName: string, customName: string | undefined, embeddedPrefixes: string[]): string {
    return snake(embeddedPrefixes.concat('').join('_')) + (customName ?? snake(propertyName));
  }

  override relationName(propertyName: string): string {
    return snake(propertyName);
  }

  override joinColumnName(relationName: string, referencedColumnName: string): string {
    return snake(`${relationName}_${referencedColumnName}`);
  }

  override joinTableName(firstTableName: string, secondTableName: string, firstPropertyName: string): string {
    return snake(`${firstTableName}_${firstPropertyName.replace(/\./gi, '_')}_${secondTableName}`);
  }

  override joinTableColumnName(tableName: string, propertyName: string, columnName?: string): string {
    return snake(`${tableName}_${columnName ?? propertyName}`);
  }
}
